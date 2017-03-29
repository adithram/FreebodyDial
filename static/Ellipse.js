"use strict";
function Ellipse() {
    assert_new.check(this);
    var m_radii = zero_vect();
    // location means origin
    var m_location = zero_vect();
    
    var m_first_point = undefined;
    var m_finished_creating = false;
    var self = this;
    this.set_location = function(x_, y_) { m_location = { x: x_, y: y_ }; }
    this.set_radii = function(x_, y_) { m_radii = { x: x_, y: y_ }; }
    this.finished_creating = function() { return m_finished_creating; }
    this.highlight = function() {}
    this.unhighlight = function() {}
    this.enable_editing  = function() {}
    this.disable_editing = function() {}
        
    this.point_within = undefined;
    this.explode = function() { return this; } 
    this.bounds = function() {
        return { x : m_location.x - m_radii.x, 
                 y : m_location.y - m_radii.y, 
                 width : m_radii.x*2.0, 
                 height: m_radii.y*2.0 }
    }
    
    var creation_second_handle_cursor_click = function(cursor_obj) {
        if (cursor_obj.is_pressed()) return; // release event only
        // initial function
        console.log('moving to final step...')
        m_first_point = cursor_obj.location();
        self.handle_cursor_move = function(cursor_obj) {
            var cur_loc = cursor_obj.location();
            // x1 = x0 + a * cos(t) -> (x1 - x0)/cos(t) = a 
            // y1 = y0 + b * sin(t) -> (y1 - y0)/sin(t) = b
            // x2 = x0 + a * cos(u)
            // y2 = y0 + b * sin(u)
            // x1 - x2 = a * cos(t) - a * cos(u)
            // x1 - x2 = a * ( cos(t) - cos(u) )
            // y1 - y2 = b * ( sin(t) - sin(u) )
            //var u = Vector.angle_between({ x: 1, y: 0 }, m_first_point);
            //var t = Vector.angle_between({ x: 1, y: 0 }, cur_loc      );
            var num = cur_loc.x**2*m_first_point.y**2 - cur_loc.y**2*m_first_point.x**2;
            m_radii.x = Math.sqrt(Math.abs(num / (cur_loc.x**2 - m_first_point.x**2)));
            m_radii.y = Math.sqrt(Math.abs(num / (cur_loc.y**2 - m_first_point.y**2)));
            //m_radii.y = (cur_loc.x - m_first_point.x) / (Math.cos(t) - Math.cos(u));
            //m_radii.x = (cur_loc.y - m_first_point.y) / (Math.sin(t) - Math.sin(u));
            if (Math.random() > 0.95) {
                //console.log("angle values fp: "+u+" cur_pos: "+t);
                console.log("radii values : (x: "+m_radii.x+", y: "+m_radii.y+")");
            }
        }
        self.handle_cursor_click = function(cursor_obj) {
            if (!cursor_obj.is_pressed()) {
                m_finished_creating = true;
                self.handle_cursor_click = self.handle_cursor_move = function(_) {}
            }
        }
    }
    
    this.handle_cursor_click = function(cursor_obj) {
        if (cursor_obj.is_pressed()) {
            m_location = cursor_obj.location();
            console.log("ellipse location set");
            return;
        }
        console.log("cursor move event function changed");
        self.handle_cursor_move = function(cursor_obj) {
            m_radii.x = m_radii.y = Vector.distance(cursor_obj.location(), m_location);
        }
        
        self.handle_cursor_click = creation_second_handle_cursor_click;
    }
    
    this.handle_cursor_move = function(_) {} 
    
    this.draw = function(context) {
        // save state
        context.save();

        // scale context horizontally
        context.translate(m_location.x, m_location.y);
        context.scale    (m_radii.x   , m_radii.y   );
        
        // draw circle which will be stretched into an oval
        context.beginPath();
        context.arc(0, 0, 1, 0, 2*Math.PI, false);
        
        // restore to original state
        context.restore();

        // apply styling
        context.fillStyle = 'black';
        context.fill();
        context.lineWidth = 3;
        context.strokeStyle = 'black';
        context.stroke();
        if (m_first_point !== undefined) {
            var fp_bounds = Vector.bounds_around(m_first_point, { x: 10, y: 10 });
            draw_bounds_as_black_outlined_box(context, fp_bounds, 'black');
        }
    }
}
