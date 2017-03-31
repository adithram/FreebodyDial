"use strict";
function Group(sub_items) {
    assert_new.check(this);
    
    var m_sub_items      = sub_items;
    var m_top_left       = undefined;
    var m_bottom_right   = undefined;
    var m_control_points = undefined;
    var m_is_editing     = false;
    
    var for_init_compute_bounds_around_array = function(items) {
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
    }
    for_init_compute_bounds_around_array(sub_items);
    for_init_compute_bounds_around_array = undefined;
    
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
    
    this.explode = function() {
        return m_sub_items;
    }
    
    this.draw = function(context) { 
        m_sub_items.forEach(function(item) { item.draw(context); });
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
        m_control_points.set_scale_event(function(scale_vector) {
            // Scaling is easy, but there needs to be an anchor point
        });
        m_control_points.set_move_event(function(displacement) {
            // need to know how to move everything in m_sub_items
            var move_points = function(points) {
                if (points === undefined) return undefined;
                points.forEach(function(_, index) {
                    points[index].x -= displacement.x;
                    points[index].y -= displacement.y;
                });
                return points;
            };
            var move_items = function(items) {
                if (items === undefined) return undefined;
                items.forEach(function(_, index) {
                    if (items[index].points !== undefined) {
                        items[index].points = move_points(items[index].points);
                    }
                    if (items[index].items !== undefined) {
                        items[index].items = move_items(items[index].items);
                    }
                });
                return items;
            };
            m_sub_items.forEach(function(item) {
                item.expose(function(data) {
                    data.points = move_points(data.points);
                    data.items = move_items(data.items);
                    return data;
                });
                
            });
        });
    }
    
    this.disable_editing = function () {
        this.unhighlight();
        m_is_editing = false;
    }
    
    this.finished_creating = function() { return true; }
    
    this.expose = function(func) {
        var gv = { type : "Group", items : [] };
        m_sub_items.forEach(function(item) {
            item.expose(function(as_data) {
                gv.items.push(as_data);
            });
        });
    }
}
