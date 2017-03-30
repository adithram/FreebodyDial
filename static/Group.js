"use strict";
function Group(sub_items) {
    assert_new.check(this);
    
    var m_sub_items      = sub_items;
    var m_top_left       = undefined;
    var m_bottom_right   = undefined;
    var m_control_points = undefined;
    
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
    
    this.handle_cursor_click = function(cursor_obj) {}
    this.handle_cursor_move  = function(cursor_obj) {}
    this.enable_editing = function() {
        this.highlight();
    }
    this.disable_editing = function () {
        this.unhighlight();
    }
    this.finished_creating = function() { return true; }
}
