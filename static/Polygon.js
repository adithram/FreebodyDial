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

function PolygonTranslationControlPoint() {
    assert_new.check(this);
    
    var m_location = undefined;
    var m_old_location = undefined;
    
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
        ;
    }
    
    this.handle_cursor_move = function(cursor_obj) {
        if (m_old_location === undefined)
            throw "set_location must be called before move events are handled";
        var diff = Vector.sub(cursor_obj.location(), m_location);
        
    }
    
    this.draw = function(context) {
        draw_bounds_as_black_outlined_box
            (context, Vector.bounds_around(m_location), 'blue');
    }
}

function PolygonEndControlPoint() {
    assert_new.check(this);
    // revealing the parent array seems to much to me
    // this dragging behavior may get a little clunky as a result
    
    var m_parent_point = undefined;
    var m_is_being_dragged = false;
    var m_parent_index = undefined;
    var self = this;
    
    var within_point = function(point) {
        //console.log(m_parent_index+' >>> <'+point.x+', '+point.y+'> within? <'+m_parent_point.x+', '+m_parent_point.y+'> (diff:'+Vector.mag(Vector.sub(m_parent_point, point))+')');
        return Vector.mag(Vector.sub(m_parent_point, point)) < 10.0;
    }
    
    this.handle_cursor_click = function(cursor_obj) {
        //console.log(m_parent_index+' >>>'+(m_is_being_dragged ? "dragged" : "")+
        //            " "+(cursor_obj.is_pressed() ? "press" : "release"))
        if (within_point(cursor_obj.location()) && cursor_obj.is_pressed()) {
            //console.log('point being dragged.');
            m_is_being_dragged = true;
        } else if (!cursor_obj.is_pressed() && m_is_being_dragged) {
            //console.log('point released from mouse.');
            m_is_being_dragged = false;
        }
    }
    
    this.handle_cursor_move = function(cursor_obj) {
        if (!m_is_being_dragged) return;
        m_parent_point = cursor_obj.location();
    }
    
    this.set_parent_point = function(point, index) {
        m_parent_point = point;
        m_parent_index = index;
    }
    
    this.parent_index = function() { return m_parent_index; }
    this.location = function() { return m_parent_point; }
    this.is_being_dragged = function() { return m_is_being_dragged; }
    
    this.draw = function(context) {
        if (m_parent_point === undefined) return;
        draw_bounds_as_black_outlined_box
            (context, Vector.bounds_around(m_parent_point, { x: 10, y: 10 }), 'yellow');
    }
}


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
     *             Functions used while editing the Polygon
     **************************************************************************/
    
    var handle_cursor_click_editing = function(cursor_obj) {
        if (!Vector.in_bounds(cursor_obj.location(), m_bounds)) return;
        m_control_points.forEach(function(control_point) {
            control_point.handle_cursor_click(cursor_obj);
        });
    };
    
    var handle_cursor_move_editing = function(cursor_obj) {
        m_control_points.forEach(function(control_point) {
            control_point.handle_cursor_move(cursor_obj);
            if (control_point.is_being_dragged()) {
                m_points[control_point.parent_index()] = 
                    control_point.location();
                //console.log('updating bounds...');
                update_bounds();
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
        m_points.forEach(function(point, index, array) {
            m_control_points.push(new PolygonEndControlPoint());
            // effectively sets a reference
            array_last(m_control_points).set_parent_point(array[index], index);
        });
        self.handle_cursor_click = handle_cursor_click_editing;
        self.handle_cursor_move = handle_cursor_move_editing;
    }
    this.disable_editing = function() {
        m_control_points = [];
        self.handle_cursor_move = self.handle_cursor_click = function(_){};
    }
    this.bounds = function() { return m_bounds; }
}
