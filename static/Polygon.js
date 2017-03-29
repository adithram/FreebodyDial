"use strict";
/*
function PolygonEndControlPoint(point_ref) {
    assert_new.check(this);
    var m_point_ref = point_ref;
    var m_is_being_dragged = false;
    
    var within_point = function(point) {
        return Vector.magnitude(Vector.sub(m_point_ref, point)) < 10.0;
    }
    
    this.handle_cursor_click = function(cursor_obj) {
        if (cursor_obj.is_pressed()) {
            m_is_being_dragged = within_point(cursor_obj.loction());
        } else {
            m_is_being_dragged = false;
        }
    }
    
    this.handle_cursor_move = function(cursor_obj) {
        if (!m_is_being_dragged) return;
        m_point_ref = cursor_obj.location();
    }
    this.draw = function(context) {
        draw_bounds_as_black_outlined_box(context, Vector.bounds_around(m_point_ref), 'yellow');
    }
}
*/

function Draggable() {
    assert_new.check(this);
    
    var m_is_being_dragged = false;
    
    var within_point = function(parent_point, cursor_point) {
        return Vector.mag(Vector.sub(parent_point, cursor_point)) < 10.0;
    }
    
    this.is_being_dragged = function() { return m_is_being_dragged; }
    
    this.handle_draggable_cursor_click = function(cursor_obj, this_location) {
        if (within_point(this_location, cursor_obj.location()) 
            && cursor_obj.is_pressed()) 
        {
            m_is_being_dragged = true;
        } else if (!cursor_obj.is_pressed() && m_is_being_dragged) {
            m_is_being_dragged = false;
        }
    }
}

function PolygonTranslationControlPoint() {
    assert_new.check(this);
    Draggable.call(this);
    
    var m_location = undefined;
    var m_old_location = undefined;
    var self = this;
    
    this.set_location = function(array_of_points) {
        var v = { x: 0, y: 0 };
        var count = 0;
        array_of_points.forEach(function(point) {
            v.x += point.x;
            v.y += point.y;
            ++count;
        });
        v.x /= count;
        v.y /= count;
        m_old_location = m_location = v;
    }
    
    this.handle_cursor_click = function(cursor_obj) {
        self.handle_draggable_cursor_click(cursor_obj, m_location);
    }
    
    this.handle_cursor_move = function(cursor_obj, polygon_points) {
        if (!self.is_being_dragged()) return;
        if (m_old_location === undefined)
            throw "set_location must be called before move events are handled";
        var displacement = Vector.sub(m_location, m_old_location);
        m_old_location = m_location;
        m_location = cursor_obj.location();
        polygon_points.forEach(function(_, index, array) {
            array[index] = Vector.add(array[index], displacement);
        });
    }
    
    this.draw = function(context) {
        draw_bounds_as_black_outlined_box
            (context, Vector.bounds_around(m_location, { x: 10, y : 10 }), 'blue');
    }
}

PolygonTranslationControlPoint.prototype = Object.create(Draggable.prototype);
PolygonTranslationControlPoint.prototype.constructor = PolygonTranslationControlPoint;

function PolygonEndControlPoint() {
    assert_new.check(this);
    Draggable.call(this);
    
    // revealing the parent array seems to much to me
    // this dragging behavior may get a little clunky as a result
    
    var m_parent_point = undefined;
    var m_parent_index = undefined;
    var self = this;
    
    self.handle_cursor_click = function(cursor_obj) {
        self.handle_draggable_cursor_click(cursor_obj, m_parent_point);
    }
    
    self.handle_cursor_move = function(cursor_obj, polygon_points) {
        if (self.is_being_dragged()) {
            m_parent_point = cursor_obj.location();
            polygon_points[m_parent_index] = m_parent_point;
        } else if (cursor_obj.is_pressed()) {
            m_parent_point = polygon_points[m_parent_index];
        }
    }
    
    self.set_parent_point = function(point, index) {
        m_parent_point = point;
        m_parent_index = index;
    }
    
    self.location = function() { return m_parent_point; }
    
    self.draw = function(context) {
        if (m_parent_point === undefined) return;
        draw_bounds_as_black_outlined_box
            (context, Vector.bounds_around(m_parent_point, { x: 10, y: 10 }), 'yellow');
    }
}

PolygonEndControlPoint.prototype = Object.create(Draggable.prototype);
PolygonEndControlPoint.prototype.constructor = PolygonEndControlPoint;

// this will have different control points compared to other primitives
// editing behaviors:
// - merge to points to eliminate a side
// - two sideds should be removed
// - midpoints "break" a side into two
// - central point for controlling translation
function Polygon() {
    assert_new.check(this);
    var m_points = [];
    var m_bounds = undefined;
    var m_candidate_point = undefined;
    
    var m_control_points = [];
    var self = this;
    
    var draw_line_from_index = function(context, index) {
        var next_index = (index + 1) % m_points.length;
        draw_line(context, m_points[index], m_points[next_index]);        
    }
    
    var draw_line = function(context, point_a, point_b) {
        context.beginPath();
        context.moveTo(point_a.x, point_a.y);
        context.lineTo(point_b.x, point_b.y);
        context.lineWidth = 5;
        context.stroke();
    }
    
    var within_first_point = function(cursor_loc) {
        if (m_points.length === 0) return false;
        return Math.abs(m_points[0].x - cursor_loc.x) < 10.0 &&
               Math.abs(m_points[0].y - cursor_loc.y) < 10.0;
    }
    
    var update_bounds = function() {
        if (m_points.length === 0)
            return { x: 0, y: 0, width: 0, height: 0 };
        var min_x = Infinity, min_y = Infinity, max_x = 0, max_y = 0;
        m_points.forEach(function(pt) {
            min_x = Math.min(min_x, pt.x);
            min_y = Math.min(min_y, pt.y);
            max_x = Math.max(max_x, pt.x);
            max_y = Math.max(max_y, pt.y);
        });
        return m_bounds = { x: min_x, y: min_y, 
                            width: max_x - min_x, height: max_y - min_y };
    }
    
    /***************************************************************************
     *             Functions used while creating the Polygon
     **************************************************************************/
    
    var handle_cursor_click_creation = function(cursor_obj) {
        if (m_points.length === 0 && cursor_obj.is_pressed()) {
            m_points.push(cursor_obj.location());
            return;
        }
        if (!cursor_obj.is_pressed()) {
            // is within 10px either way
            if (within_first_point(cursor_obj.location())) {
                // finish creating...
                self.handle_cursor_click = self.handle_cursor_move = 
                    function(_) {};
                self.draw = draw_while_editing_or_viewing;
                update_bounds();
                return;
            }
            m_points.push(cursor_obj.location());
        }
    }
    
    var handle_cursor_move_creation = function(cursor_obj) {
        if (m_points.length > 0) {
            m_candidate_point = cursor_obj.location();
        }
    }
    
    var draw_while_creating = function(context) {
        // initial draw function while the polygon object is being created
        for (var i = 0; i !== m_points.length - 1; ++i)
            draw_line_from_index(context, i);
        if (m_points.length !== 0 && m_candidate_point !== undefined) {
            draw_line(context, array_last(m_points), m_candidate_point);
            draw_line(context, m_candidate_point   , m_points[0]      );
        }

    }
    
    /***************************************************************************
     *             Helper functions for editing the Polygon
     **************************************************************************/
    
    var check_point_merging = function(index) {
        var cpt = m_control_points[index].location();
        var check_neighbor_for_merge = function(offset) {
            var np = m_control_points[index + offset].location();
            if (Vector.mag(Vector.sub(np, cpt)) < 10) {
                m_control_points.splice(index, 1);
                m_points.splice(index, 1);
                console.log('spliced polygon'+m_points.length);
            }
        };
        if (index > 0) check_neighbor_for_merge(-1);
        if (index < m_points.length - 1) check_neighbor_for_merge(1);
    }
    
    /***************************************************************************
     *             Functions used while editing the Polygon
     **************************************************************************/
    
    var handle_cursor_click_editing = function(cursor_obj) {
        m_control_points.forEach(function(control_point) {
            control_point.handle_cursor_click(cursor_obj);
        });
        // note: assumes last is the translation control point
        array_last(m_control_points).set_location(m_points);
    };
    
    var handle_cursor_move_editing = function(cursor_obj) {
        m_control_points.forEach(function(control_point, index) {
            var was_dragged = control_point.is_being_dragged();
            control_point.handle_cursor_move(cursor_obj, m_points);
            
            // check if two points merged
            if (was_dragged && !control_point.is_being_dragged()) {
                check_point_merging(index);
            }
        });
    }
    
    var draw_while_editing_or_viewing = function(context) {
        for (var i = 0; i !== m_points.length; ++i)
            draw_line_from_index(context, i);
        m_control_points.forEach(function(control_point) {
            control_point.draw(context);
        });
    };
    
    /***************************************************************************
     *                          'public' functions
     **************************************************************************/
    
    this.handle_cursor_click = handle_cursor_click_creation;
    this.handle_cursor_move = handle_cursor_move_creation;
    this.draw = draw_while_creating;
    
    this.finished_creating = function() { 
        return self.draw === draw_while_editing_or_viewing; 
    }
    this.enable_editing = function() {
        self.highlight();
        m_control_points.push(new PolygonTranslationControlPoint());
        array_last(m_control_points).set_location(m_points);
        self.handle_cursor_click = handle_cursor_click_editing;
        self.handle_cursor_move = handle_cursor_move_editing;
    }
    this.disable_editing = function() {
        m_control_points = [];
        self.handle_cursor_move = self.handle_cursor_click = function(_){};
    }
    this.bounds = function() { return m_bounds; }
    this.point_within = function(cursor_loc, size) {
        return Vector.in_bounds(cursor_loc, self.bounds());
    }
    this.highlight = function() {
        m_points.forEach(function(point, index, array) {
            m_control_points.push(new PolygonEndControlPoint());
            // effectively sets a reference
            array_last(m_control_points).set_parent_point(array[index], index);
        });
    }
    this.unhighlight = function() {
        m_control_points = [];
    }
    this.explode = function() { return this; }
} // end of Polygon
