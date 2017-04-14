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

// desired features:
// scaling
// translation
function RectangularControlPoints(top_left, bottom_right) {
    assert_new.check(this);
    var k = Object.freeze({
        TOP_LEFT : 0, TOP_RIGHT : 1, BOTTOM_RIGHT : 2, BOTTOM_LEFT : 3
    });
    var m_bounds_points = [undefined, undefined, undefined, undefined];
    var m_move_point = undefined;

    var m_on_scale = function (_) {};
    var m_on_move  = function (_) {};
    var m_is_being_dragged = false;
    var self = this;

    (function() {
        var pts = m_bounds_points;
        pts[k.TOP_LEFT    ] = top_left;
        pts[k.TOP_RIGHT   ] = { x: bottom_right.x, y: top_left.y };
        pts[k.BOTTOM_RIGHT] = bottom_right;
        pts[k.BOTTOM_LEFT ] = { x: top_left.x, y: bottom_right.y };
    })();

    function point_size() { return 10.0; }

    function bounds_around(point) {
        return Vector.bounds_around(point, { x: point_size(), y: point_size() });
    }
    function draw_bounds(context, cp_bounds, fill_color) {
        draw_bounds_as_black_outlined_box(context, cp_bounds, fill_color);
    }

    function cursor_in_pt(cursor_obj, point) {
        return Vector.in_bounds(cursor_obj.location(), bounds_around(point));
    }

    function prev_index(idx) {
        if (idx === 0) {
            return m_bounds_points.length - 1;
        } else {
            return idx - 1;
        }
    }

    function next_index(idx)
        { return (idx + 1) % m_bounds_points.length; }

    function update_center_point_location() {
        var top_left     = m_bounds_points[k.TOP_LEFT    ];
        var bottom_right = m_bounds_points[k.BOTTOM_RIGHT];
        m_move_point = { x: (top_left.x + bottom_right.x) / 2,
                         y: (top_left.y + bottom_right.y) / 2 };
    }
    update_center_point_location();

    function drag_end_point(cursor_obj, index) {
        // I affect my neighbors "-1" and "+1"
        var cur_loc = cursor_obj.location();
        var old_bounds = self.bounds();

        if (index % 2 === 0) {
            // next is x, prev is y
            m_bounds_points[prev_index(index)].x = cur_loc.x;
            m_bounds_points[next_index(index)].y = cur_loc.y;
        } else {
            // next is y, prev is x
            m_bounds_points[next_index(index)].x = cur_loc.x;
            m_bounds_points[prev_index(index)].y = cur_loc.y;
        }
        m_bounds_points[index] = cur_loc;

        var new_bounds = self.bounds();
        if (new_bounds.x !== old_bounds.x || new_bounds.y !== old_bounds.y) {
            // add translation event
            m_on_move(Vector.sub(old_bounds, new_bounds));
        }
        // independant handling for negative widths/heights?
        var scaling_vector = { x: new_bounds.width  / old_bounds.width,
                               y: new_bounds.height / old_bounds.height };
        /*var anchor_point = { x: Infinity, y: Infinity };
        m_bounds_points.forEach(function (point, index) {
            // point does not behave as a reference!
            for (var prop in point) {
                //console.log('point["'+prop+'"] = Math.min('+anchor_point[prop]+', '+point[prop]+');');
                anchor_point[prop] = Math.min(anchor_point[prop], point[prop]);
            }
        });*/
        m_on_scale(scaling_vector, m_bounds_points[0]);
        update_center_point_location();
    }

    function drag_center_point(cursor_obj) {
        var displacement = Vector.sub(m_move_point, cursor_obj.location());
        m_move_point = cursor_obj.location();
        m_bounds_points.forEach(function(_, index) {
            m_bounds_points[index].x -= displacement.x;
            m_bounds_points[index].y -= displacement.y;
        });
        m_on_move(displacement);
    }

    this.handle_cursor_click = function(cursor_obj) {
        if (!cursor_obj.is_pressed()) {
            m_is_being_dragged = false;
            self.handle_cursor_move = function(_){};
            return;
        }

        // scaling control points
        m_bounds_points.forEach(function(pt, index) {
            if (!cursor_in_pt(cursor_obj, pt)) return;

            m_is_being_dragged = true;
            // switch to drag behavior
            // which point though?
            self.handle_cursor_move = function(cursor_obj) {
                drag_end_point(cursor_obj, index);
            }
            return true; // breaks
        });
        if (cursor_in_pt(cursor_obj, m_move_point)) {
            m_is_being_dragged = true;
            self.handle_cursor_move = drag_center_point;
        }
    }
    this.handle_cursor_move = function(_) {};

    this.bounds = function() {
        // I wonder if I can just use the constructor arguments
        // (well no garuantee that it's not undef'd)
        var bottom_right_ = m_bounds_points[k.BOTTOM_RIGHT];
        return {
            x      : m_bounds_points[k.TOP_LEFT].x,
            y      : m_bounds_points[k.TOP_LEFT].y,
            width  : bottom_right_.x - m_bounds_points[k.TOP_LEFT].x,
            height : bottom_right_.y - m_bounds_points[k.TOP_LEFT].y
        };
    }

    this.draw = function(context) {
        m_bounds_points.forEach(function(bounds_point) {
            draw_bounds(context, bounds_around(bounds_point), 'yellow');
        });
        draw_bounds(context, bounds_around(m_move_point), 'blue');
    }

    this.set_scale_event = function(func) { m_on_scale = func; }
    this.set_move_event = function(func) { m_on_move = func; }

}
