"use strict";

function RectangularControlPoints(top_left, bottom_right) {
    assert_new.check(this);
    
    var m_bounds_points = [top_left    , { x: bottom_right.x, y: top_left.y },
                           bottom_right, { x: top_left.x, y: bottom_right.y }];
    var m_move_point = { x: (top_left.x + bottom_right.x)/2,
                         y: (top_left.y + bottom_right.y)/2 };
    
    function point_size() { return 10.0; }
    
    function bounds_around(point) {
        return Vector.bounds_around(point, { x: point_size(), y: point_size() });
    }
    function draw_bounds(context, cp_bounds, fill_color) {
        draw_bounds_as_black_outlined_box(context, cp_bounds, fill_color);
    }
    this.draw = function(context) {
        for_each(m_bounds_points, function(bounds_point) {
            draw_bounds(context, bounds_around(bounds_point), 'yellow');
        });
        draw_bounds(context, bounds_around(m_move_point), 'blue');
    }
}
