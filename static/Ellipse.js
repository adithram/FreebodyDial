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

/*******************************************************************************************************
    CONCEPT OF THE OPERATION
        1) User first clicks to set origin
        2) User holds mouse to set vertex, then releases to set vertex location
        3) User clicks a second time to set co-vertex
        4) Canvas draws ellipse based on vertex and co-vertex locations, based on the following function

            function ellipse(context, m_co_vertex.x, m_co_vertex.y, m_vertex.x, m_vertex.y){
                context.save(); // save state
                context.beginPath();

                context.translate(m_co_vertex.x-m_vertex.x, m_co_vertex.y-m_vertex.y);
                context.scale(m_vertex.x, m_vertex.y);
                context.arc(1, 1, 1, 0, 2 * Math.PI, false);

                context.restore(); // restore to original state
                context.stroke();
            }

********************************************************************************************************/

function find_angle(A,B,C) {
    var AB = Math.sqrt(Math.pow(B.x-A.x,2)+ Math.pow(B.y-A.y,2));    
    var BC = Math.sqrt(Math.pow(B.x-C.x,2)+ Math.pow(B.y-C.y,2)); 
    var AC = Math.sqrt(Math.pow(C.x-A.x,2)+ Math.pow(C.y-A.y,2));
    return Math.acos((BC*BC+AB*AB-AC*AC)/(2*BC*AB));
}

function Ellipse() {
    assert_new.check(this);
    var m_vertex = zero_vect();
    var m_co_vertex = zero_vect();
    var m_origin = zero_vect();
    
    var m_first_point = undefined;
    var m_finished_creating = false;
    var self = this;
    
    // Default values. 
    this.set_location = function(x_, y_) { m_origin = { x: x_, y: y_ }; }
    this.set_vertex = function(x_, y_) { m_vertex = { x: x_, y: y_ }; }
    this.set_co_vertex = function(x_, y_) { m_co_vertex = { x: x_, y: y_ }; }
    this.finished_creating = function() { return m_finished_creating; }
    this.highlight = function() {}
    this.unhighlight = function() {}
    this.enable_editing  = function() {}
    this.disable_editing = function() {}
        
    this.point_within = function() {

    }
    this.explode = function() { return this; } 
    this.bounds = function() {
        return { x : m_origin.x - m_vertex.x, 
                 y : m_origin.y - m_vertex.y, 
                 width : m_vertex.x*2.0, 
                 height: m_vertex.y*2.0 }
    }
    
    var creation_second_handle_cursor_click = function(cursor_obj) {
        if (cursor_obj.is_pressed()) return; // release event only
        // initial function
        console.log('moving to final step...')
        m_vertex = cursor_obj.location();
        console.log("Vertex Location: ", m_vertex.x, ", ", m_vertex.y);
        /*self.handle_cursor_move = function(cursor_obj) {
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
            m_co_vertex.x = Math.sqrt(Math.abs(num / (cur_loc.x**2 - m_first_point.x**2)));
            m_co_vertex.y = Math.sqrt(Math.abs(num / (cur_loc.y**2 - m_first_point.y**2)));
            //m_vertex.y = (cur_loc.x - m_first_point.x) / (Math.cos(t) - Math.cos(u));
            //m_vertex.x = (cur_loc.y - m_first_point.y) / (Math.sin(t) - Math.sin(u));
            if (Math.random() > 0.95) {
                //console.log("angle values fp: "+u+" cur_pos: "+t);
                //console.log("m_co_vertex values : (x: "+m_co_vertex.x+", y: "+m_co_vertex.y+")");
            }
        }*/
        self.handle_cursor_click = function(cursor_obj) {
            if (!cursor_obj.is_pressed()) {
                m_finished_creating = true;
                console.log("Second click registered! We done :D");
                m_co_vertex = cursor_obj.location();
                self.handle_cursor_click = self.handle_cursor_move = function(_) {}
            }
        }
    }
    
    this.handle_cursor_click = function(cursor_obj) {
        if (cursor_obj.is_pressed()) {
            m_origin = cursor_obj.location();
            console.log("ellipse location set at ", m_origin.x, ", ", m_origin.y);
        }
        console.log("cursor move event function changed");
        self.handle_cursor_move = function(cursor_obj) {
            m_vertex = cursor_obj.location();
            if(!cursor_obj.is_pressed()){
                console.log("Mouse released. STOP DRAWING.");
                return;
            }
        }
        
        self.handle_cursor_click = creation_second_handle_cursor_click;
    }
    
    this.handle_cursor_move = function(_) {} 
    
    this.draw = function(context) {
        // save state
        /*context.save();

        console.log("Drawing ellipse...");

        // scale context horizontally
        context.translate(m_origin.x, m_origin.y);
        context.scale    (m_vertex.x   , m_vertex.y   );
        
        // draw circle which will be stretched into a proper Ellipse
        context.beginPath();
        context.arc(0, 0, 1, 0, 2*Math.PI, false);
        
        // restore to original state
        context.restore();

        // apply styling
        context.fillStyle = 'black';
        context.fill();
        context.lineWidth = 3;
        context.strokeStyle = 'black';
        context.stroke();*/

        context.beginPath();
        context.moveTo(m_origin.x, m_origin.y);
        context.lineTo(m_vertex.x, m_vertex.y);
        context.lineWidth = 5;
        context.strokeStyle = 'black';
        context.stroke();
        context.closePath();

        if(m_finished_creating){
            //context.save();

            /*var width = Vector.distance(m_origin, m_co_vertex);
            var height = Vector.distance(m_origin, m_vertex);
            context.beginPath();
            context.moveTo(m_origin.x, m_origin.y - height / 2);

            context.bezierCurveTo(
                m_origin.x + width / 2, m_origin.y - height / 2,
                m_origin.x + width / 2, m_origin.y + height / 2,
                m_origin.x, m_origin.y + height / 2
            );
            context.bezierCurveTo(
                m_origin.x - width / 2, m_origin.y + height / 2,
                m_origin.x - width / 2, m_origin.y - height / 2,
                m_origin.x, m_origin.y - height / 2
            );

            context.restore();*/

            // Attempt 2
            /*var major_radius = Vector.distance(m_origin, m_co_vertex);
            var minor_radius = Vector.distance(m_origin, m_vertex);
            //var rotation_angle = find_angle()
            context.ellipse(m_origin.x, m_origin.y, major_radius, minor_radius, 0, 0, 2*Math.PI);

            context.fillStyle = 'black';
            context.fill();*/
            context.beginPath();
            context.moveTo(m_origin.x, m_origin.y);
            context.lineTo(m_co_vertex.x, m_co_vertex.y);
            context.lineWidth = 5;
            context.strokeStyle = 'black';
            context.stroke();
            context.closePath();
        }

        else{
            context.beginPath();

            context.closePath();
        }
    }

    this.expose = function() {
        /*var gv = func({ type : "Ellipse", points : m_origin, m_vertex });
        if (gv === undefined) return;
        m_origin = gv.points[0];
        m_vertex = gv.points[1];
        this.disable_editing();
        this.enable_editing();*/
    }
}