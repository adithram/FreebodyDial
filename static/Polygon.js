/*******************************************************************************
 *
 *  Copyright 2017
 *  Authors: Andrew Janke, Dennis Chang, Lious Boehm, Adithya Ramanathan
 *  Released under the GPLv3
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 ******************************************************************************/

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

// Function handles the translation of the polygon. Considered "dragging"
function Draggable() {
    assert_new.check(this);

    // Default value is fase
    var m_is_being_dragged = false;

    // Check that cursor is in a position indicating the users intent to translate
    var within_point = function(parent_point, cursor_point) {
        return Vector.mag(Vector.sub(parent_point, cursor_point)) < Configuration.get_point_size();
    }

    // Update value depending on user behvaior
    this.is_being_dragged = function() { return m_is_being_dragged; }

    // Handles the click atthe correct position and updates status accordingly.
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

// Control points for the Polygon. Similar to the line control points.
// Specifically used for translation.
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

    // Translates basic cursor click to a cursor click as it relates to dragging
    this.handle_cursor_click = function(cursor_obj) {
        self.handle_draggable_cursor_click(cursor_obj, m_location);
    }

    // Handles cursor movement in the scheme of editing.
    // Curosr movement relates to dragging NOT resizing or reshaping.
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

    // Draw middle control point. Point is blue.
    this.draw = function(context) {
        var pt_size = Configuration.get_point_size();
        draw_bounds_as_black_outlined_box
            (context, Vector.bounds_around(m_location, { x: pt_size, y : pt_size }), 'blue');
    }
}

PolygonTranslationControlPoint.prototype = Object.create(Draggable.prototype);
PolygonTranslationControlPoint.prototype.constructor = PolygonTranslationControlPoint;

//Polygon control points specifically used for resizing or reshaping.
function PolygonEndControlPoint() {
    assert_new.check(this);
    Draggable.call(this);

    // revealing the parent array seems to much to me
    // this dragging behavior may get a little clunky as a result

    var m_parent_point = undefined;
    var m_parent_index = undefined;
    var self = this;

    // Handles cursor click which indicates the users intent ot resize or reshape
    self.handle_cursor_click = function(cursor_obj) {
        self.handle_draggable_cursor_click(cursor_obj, m_parent_point);
    }

    // Handles the cursor movement once a click has occured
    // Handles the actual resizing or reshaping
    self.handle_cursor_move = function(cursor_obj, polygon_points) {
        if (self.is_being_dragged()) {
            m_parent_point = cursor_obj.location();
            polygon_points[m_parent_index] = m_parent_point;
        } else if (cursor_obj.is_pressed()) {
            m_parent_point = polygon_points[m_parent_index];
        }
    }

    // Update the parent point.
    self.set_parent_point = function(point, index) {
        m_parent_point = point;
        m_parent_index = index;
    }

    // Understand location after changes have occured.
    self.location = function() { return m_parent_point; }

    // Draw end control points. Points are yellow.
    self.draw = function(context) {
        if (m_parent_point === undefined) return;
        var pt_size = Configuration.get_point_size();
        draw_bounds_as_black_outlined_box
            (context, Vector.bounds_around(m_parent_point, { x: pt_size, y: pt_size }), 'yellow');
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
    // Array for polygon points
    var m_points = [];
    var m_bounds = undefined;
    var m_candidate_point = undefined;

    // Array for polygon control points
    var m_control_points = [];
    var self = this;

    // Draw line from index:
    // - Index is the starting point
    // - Consider a polyfon as a structure made up of lines.
    // - Fisrt line is contructed with index and end position.
    var draw_line_from_index = function(context, index) {
        var next_index = (index + 1) % m_points.length;
        draw_line(context, m_points[index], m_points[next_index]);
    }

    // All other polygon lines are a function or a point_a and a point_b
    var draw_line = function(context, point_a, point_b) {
        context.beginPath();
        context.moveTo(point_a.x, point_a.y);
        context.lineTo(point_b.x, point_b.y);
        context.lineWidth = Configuration.get_line_thickness();
        context.stroke();
    }

    // The polygon is closed by returning to the first point.
    // This function is used to understand whether the polygon is considered finished.
    var within_first_point = function(cursor_loc) {
        if (m_points.length === 0) return false;
        var pt_size = Configuration.get_point_size();
        return Math.abs(m_points[0].x - cursor_loc.x) < pt_size &&
               Math.abs(m_points[0].y - cursor_loc.y) < pt_size;
    }

    // Updates the bounds
    var update_bounds = function() {
        if (m_points.length === 0)
            return m_bounds = { x: 0, y: 0, width: 0, height: 0 };
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

    // Handles the cursor click which indicates the intialization of
    // polygon drawing, the addition of a new corner, or the closing
    // of the polygon
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

    // Handles cursor movement which indicates the various other points
    var handle_cursor_move_creation = function(cursor_obj) {
        if (m_points.length > 0) {
            m_candidate_point = cursor_obj.location();
        }
    }

    // Function such that as new corner points are added, and as the cursor
    // is moved, the object is drawed.
    var draw_while_creating = function(context) {
        // initial draw function while the polygon object is being created
        var save_restore = function(context, func) {
            context.save();
            func();
            context.restore();
        };
        // The polygon is a bunch of lines connected through a point
        for (var i = 0; i !== m_points.length - 1; ++i)
            draw_line_from_index(context, i);
        if (m_points.length !== 0 && m_candidate_point !== undefined) {
            draw_line(context, array_last(m_points), m_candidate_point);
            draw_line(context, m_candidate_point   , m_points[0]      );
        }
        if (m_points.length !== 0) {
            var radius = 5;
            var pt = m_points[0];
            save_restore(context, function() {
                context.beginPath();
                context.arc(pt.x - radius, pt.y - radius, radius, 0, 2*Math.PI, false);

                // apply styling
                // Indicator for point to return to
                context.font = '12pt Verdana';
                context.fillText("Click here to finish drawing.", pt.x, pt.y);
                context.lineWidth = 3;
                context.strokeStyle = 'red';
                context.stroke();
            });
        }
    }

    /***************************************************************************
     *             Helper functions for editing the Polygon
     **************************************************************************/

    var check_point_merging = function(index) {
        var cpt = m_control_points[index].location();
        var check_neighbor_for_merge = function(offset) {
            var np = m_control_points[index + offset].location();
            if (Vector.mag(Vector.sub(np, cpt)) < Configuration.get_point_size()) {
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

    // Cursor click in edit mode. Indicates which control point was selected.
    var handle_cursor_click_editing = function(cursor_obj) {
        m_control_points.forEach(function(control_point) {
            control_point.handle_cursor_click(cursor_obj);
        });
        // note: assumes last is the translation control point
        array_last(m_control_points).set_location(m_points);
    };

    // Cursor movement after a control point has been selected.
    // Handles movement, reshaping, or resizing
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

    // Allows for line visiibility while editing.
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
    // Function that indicates a change to edit mode.
    this.enable_editing = function() {
        self.highlight();
        m_control_points.push(new PolygonTranslationControlPoint());
        array_last(m_control_points).set_location(m_points);
        self.handle_cursor_click = handle_cursor_click_editing;
        self.handle_cursor_move = handle_cursor_move_editing;
    }
    // Function that indicates a change away from edit mode to any other mode.
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
    // Handles encoding.
    // Currently used for grouping.
    // Will be used for loading and exporting diagrams as well.
    this.expose = function(func) {
        var gv = func({ type : "Polygon", points : deepcopy(m_points) });
        if (gv === undefined) return;
        m_points = deepcopy(gv.points);
        update_bounds();
        this.draw = draw_while_editing_or_viewing;
        self.handle_cursor_move = self.handle_cursor_click = function(_){};
        if (m_control_points.length === 0) return;
        this.disable_editing();
        this.enable_editing();
    }
} // end of Polygon
