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

function Group(sub_items) {
    assert_new.check(this);

    var m_sub_items      = sub_items;
    var m_top_left       = undefined;
    var m_bottom_right   = undefined;
    var m_control_points = undefined;
    var m_is_editing     = false;

    var m_scale = { x: 1, y: 1 };
    var self = this;

    (function(items) {
        var top_left_most     = { x:  Infinity, y:  Infinity };
        var bottom_right_most = { x: -Infinity, y: -Infinity };
        items.forEach(function(item) {
            var bounds_ = item.bounds();
            top_left_most.x = Math.min(top_left_most.x, bounds_.x);
            top_left_most.y = Math.min(top_left_most.y, bounds_.y);
            var right = bounds_.x + bounds_.width;
            var bottom = bounds_.y + bounds_.height;
            bottom_right_most.x = Math.max(bottom_right_most.x, right );
            bottom_right_most.y = Math.max(bottom_right_most.y, bottom);
        });
        m_top_left     = top_left_most;
        m_bottom_right = bottom_right_most;
    })(sub_items);

    /***************************************************************************
     *                         Control point events
     **************************************************************************/

    var recursively_handle_items = function(items, change_points_func) {
        if (items === undefined) return undefined;
        items.forEach(function(_, index) {
            if (items[index].points !== undefined) {
                items[index].points = change_points_func(items[index].points);
            }
            if (items[index].items !== undefined) {
                items[index].items = recursively_handle_items
                    (items[index].items, change_points_func);
            }
        });
        return items;
    };

    var on_move_control_points = function(displacement) {
        // need to know how to move everything in m_sub_items
        // can probably reuse for scaling also
        var move_points = function(points) {
            if (points === undefined) return undefined;
            points.forEach(function(_, index) {
                points[index].x -= displacement.x;
                points[index].y -= displacement.y;
            });
            return points;
        };
        var move_items = function(items) {
            return recursively_handle_items(items, move_points);
        };
        m_sub_items.forEach(function(item) {
            item.expose(function(data) {
                data.points = move_points(data.points);
                data.items = move_items(data.items);
                return data;
            });

        });
    };

    var on_scale_control_points = function(scale_factor, anchor_point) {
        // Scaling is easy, but there needs to be an anchor point
        // (we also must adjust...)
        m_scale.x *= scale_factor.x;
        m_scale.y *= scale_factor.y;
        // straight multiply: (a + v)*f
        // desired          : a + v*f
        // to compensate    : a*(1 - f) + (a + v)*f
        //                    a - a*f + a*f + v*f = a + v*f
        // spelled out      : anchor_point*(1 - factor)
        var handle_points = function(points) {
            if (points === undefined) return;
            points.forEach(function(_, index) {
                points[index] = {
                    x: points[index].x*scale_factor.x +
                       anchor_point.x*(1 - scale_factor.x),
                    y: points[index].y*scale_factor.y +    // victor could've been useful here
                       anchor_point.y*(1 - scale_factor.y) };
            });
            return points;
        }
        var handle_items = function(items) {
            return recursively_handle_items(items, handle_points);
        }
        self.expose(function(obj) {
            obj.items  = handle_items (obj.items );
            obj.points = handle_points(obj.points);
            return obj;
        });
    };

    /***************************************************************************
     *                          Public interface
     **************************************************************************/

    this.highlight = function() {
        m_control_points =
            new RectangularControlPoints(m_top_left, m_bottom_right);
    }

    this.unhighlight = function() {
        m_control_points = undefined;
    }

    this.point_within = function(point, distance_limit) {
        if (Vector.in_bounds(point, this.bounds())) return true;
        var dist = Math.min( Math.abs(m_top_left.x     - point.x),
                             Math.abs(m_top_left.y     - point.y),
                             Math.abs(m_bottom_right.x - point.x),
                             Math.abs(m_bottom_right.y - point.y) );
        return (dist <= distance_limit);
    }

    this.explode = function() { return m_sub_items; }

    this.draw = function(context) {
        //context.save();
        //context.scale(m_scale.x, m_scale.y);
        m_sub_items.forEach(function(item) { item.draw(context); });
        //context.restore();
        if (m_control_points === undefined) return;
            m_control_points.draw(context);
    }

    this.bounds = function() {
        return { x: m_top_left.x, y: m_top_left.y,
                 width : m_bottom_right.x - m_top_left.x,
                 height: m_bottom_right.y - m_top_left.y };
    }

    this.handle_cursor_click = function(cursor_obj) {
        if (!m_is_editing) return;
        m_control_points.handle_cursor_click(cursor_obj);
    }

    this.handle_cursor_move  = function(cursor_obj) {
        if (!m_is_editing) return;
        m_control_points.handle_cursor_move(cursor_obj);
    }

    this.enable_editing = function() {
        this.highlight();
        m_is_editing = true;
        m_control_points.set_scale_event(on_scale_control_points);
        m_control_points.set_move_event(on_move_control_points);
    }

    this.disable_editing = function () {
        this.unhighlight();
        m_is_editing = false;
    }

    //this.finished_creating = function() { return true; }

    this.expose = function(func) {
        var gv = { type : "Group", items : [] };
        m_sub_items.forEach(function(item) {
            item.expose(function(as_data) {
                gv.items.push(as_data);
            });
        });
        var gv_ = func(gv);
        if (gv_ !== undefined)
            gv = gv_;
        m_sub_items.forEach(function(_, index) {
            m_sub_items[index].expose(function(_) {
                return gv.items[index];
            });
        });
    }
}
