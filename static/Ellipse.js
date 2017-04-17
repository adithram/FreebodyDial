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
    CONCEPT OF THE OPERATION - user will set boundaries for ellipse by clicking, dragging mouse, and releasing
        1) User clicks to set origin
        2) User holds mouse to determine size of the rectangular boundary
            - User will drag the mouse to 1 of the 4 corners of the rectangular boundary (Quadrant 1 boundary)
                and set_boundaries() will calculate the location of the other 3 corners
        3) User releases mouse to set size of the rectangular boundary
        4) User moves mouse to determine ellipse's angle of rotation
        5) User clicks mouse to anchor ellipse in place
********************************************************************************************************/

// Function handles the translation of the ellipse. Considered "dragging"
function Draggable() {
    assert_new.check(this);
    
    // Default value is false
    var m_is_being_dragged = false;
    
    //Check that cursor is in a position indicating the users intent to translate
    var within_point = function(parent_point, cursor_point) {
        return Vector.mag(Vector.sub(parent_point, cursor_point)) < 10.0;
    }
    
    // Update value depending on user behvaior
    this.is_being_dragged = function() { return m_is_being_dragged; 
    
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
}

// Control points for the Ellipse. Similar to the line control points. 
// Specifically used for translation.
function EllipseTranslationControlPoint() {
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
    this.handle_cursor_move = function(cursor_obj, ellipse_points) {
        if (!self.is_being_dragged()) return;
        if (m_old_location === undefined)
            throw "set_location must be called before move events are handled";
        var displacement = Vector.sub(m_location, m_old_location);
        m_old_location = m_location;
        m_location = cursor_obj.location();
        ellipse_points.forEach(function(_, index, array) {
            array[index] = Vector.add(array[index], displacement);
        });
    }
    
    // Draw middle control point. Point is blue. 
    this.draw = function(context) {
        draw_bounds_as_black_outlined_box
            (context, Vector.bounds_around(m_location, { x: 10, y : 10 }), 'blue');
    }
}

EllipseTranslationControlPoint.prototype = Object.create(Draggable.prototype);
EllipseTranslationControlPoint.prototype.constructor = EllipseTranslationControlPoint;

//Ellipse control points specifically used for resizing or reshaping. 
function EllipseEndControlPoint() {
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
    self.handle_cursor_move = function(cursor_obj, ellipse_points) {
        if (self.is_being_dragged()) {
            m_parent_point = cursor_obj.location();
            ellipse_points[m_parent_index] = m_parent_point;
        } else if (cursor_obj.is_pressed()) {
            m_parent_point = ellipse_points[m_parent_index];
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
        draw_bounds_as_black_outlined_box
            (context, Vector.bounds_around(m_parent_point, { x: 10, y: 10 }), 'yellow');
    }
}

EllipseEndControlPoint.prototype = Object.create(Draggable.prototype);
EllipseEndControlPoint.prototype.constructor = EllipseEndControlPoint;

// from http://stackoverflow.com/questions/17763392/how-to-calculate-in-javascript-angle-between-3-points
function find_angle(A,B,C) {
    var AB = Math.sqrt(Math.pow(B.x-A.x,2)+ Math.pow(B.y-A.y,2));    
    var BC = Math.sqrt(Math.pow(B.x-C.x,2)+ Math.pow(B.y-C.y,2)); 
    var AC = Math.sqrt(Math.pow(C.x-A.x,2)+ Math.pow(C.y-A.y,2));
    return Math.acos((BC*BC+AB*AB-AC*AC)/(2*BC*AB));
}

function Ellipse() {
    assert_new.check(this);
    var q1_boundary = zero_vect();
    var q2_boundary = zero_vect();
    var q3_boundary = zero_vect();
    var q4_boundary = zero_vect();
    var x_axis = zero_vect();
    var m_vertex = zero_vect();
    var m_origin = zero_vect();
    var m_major_vertex = 0;
    var m_minor_vertex = 0;
    var m_bounds = [];
    var relative_zero = zero_vect();
    var m_boundaries_set = false;
    var m_finished_creating = false;
    var self = this;
    
    // Default values. 
    this.set_location = function(x_, y_) { origin = { x: x_, y: y_ }; }
    this.finished_creating = function() { return m_finished_creating; }

    // unused functions?
    this.highlight = function() {}
    this.unhighlight = function() {}
    this.enable_editing  = function() {}
    this.disable_editing = function() {}
    this.point_within = function() {}

    this.explode = function() { return this; } 
    this.bounds = function() {
        return { q1_boundary,
                 q2_boundary,
                 q3_boundary,
                 q4_boundary }
    }

    // Calculates all 4 points of the rectangular boundary surrounding the ellipse
    // REQUIRES: (q1_boundary.x, q1_boundary.y), the Quadrant 1 boundary, AKA the top right corner boundary
    //           (x_axis_x, x_axis.x), the location of the relative x axis limit for the ellipse on the canvas
    //              NOTE: Also, the location of the midpoint of the right side of the rectangular boundary
    // MODIFIES: this.boundaries
    // EFFECTS: returns the 4 points of the rectangular boundary surrounding the ellipse
    this.set_boundaries = function() { 

        //NOTE: q2_boundary's x value can be calculated by subtracting 2 of the x_axis_x lengths from q1_boundary.x
        //      q2_boundary's y value is the same as q1_boundary.y
        var q2_x = q1_boundary.x - 2*(x_axis.x - m_origin.x);
        var q2_y = q1_boundary.y;
        q2_boundary = {x: q2_x, y: q2_y};

        // NOTE: q3_boundary's x value is the same as q2_x
        //       q3_boundary's y value can be calculated by subtracting 2 of the q2_y lengths from q2_y
        var q3_x = q2_x;
        var q3_y = q2_y - 2*(q2_y - m_origin.y);
        q3_boundary = {x: q3_x, y: q3_y};

        //NOTE: q4_boundary's x value is the same as q1_boundary.x
        //      q4_boundary's y value is the same as q3_y
        var q4_x = q1_boundary.x;
        var q4_y = q3_y;
        q4_boundary = {x: q4_x, y: q4_y};

        // console.log("Q1 Boundary: ", q1_boundary);
        // console.log("Q2 Boundary: ", q2_boundary);
        // console.log("Q3 Boundary: ", q3_boundary);
        // console.log("Q4 Boundary: ", q4_boundary);

        // Major Vertex Length = Distance from Q1 to Q2 boundaries / 2
        m_major_vertex = Vector.distance(q2_boundary, q1_boundary) / 2;

        // Minor Vertex Length = Distance from Q1 to Q4 boundaries / 2
        m_minor_vertex = Vector.distance(q4_boundary, q1_boundary) / 2;

        console.log("Major Vertex Length: ", m_major_vertex);
        console.log("Minor Vertex Length: ", m_minor_vertex);

    }
    
    var creation_second_handle_cursor_click = function(cursor_obj) {
        if (cursor_obj.is_pressed()) return; // release event only

        self.handle_cursor_move = function(cursor_obj) {
            /*var A = cursor_obj.location();
            var B = m_origin;
            var C = relative_zero;
            console.log("Point of reference for angle calculations: ", C);
            var angle_of_rotation = find_angle(A,B,C);
            console.log("What's our calculated angle of rotation? ", angle_of_rotation);*/

        }
        self.handle_cursor_click = function(cursor_obj) {
            if (!cursor_obj.is_pressed()) {
                m_finished_creating = true;
                console.log("Second click registered! We done :D");
                //m_co_vertex = cursor_obj.location();
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
            q1_boundary = cursor_obj.location();
            x_axis = {x: q1_boundary.x, y: m_origin.y};
            self.set_boundaries();
            if(!cursor_obj.is_pressed()){
                q1_boundary = cursor_obj.location();
                console.log("Mouse released. STOP DRAWING.");
                relative_zero = cursor_obj.location();
                m_boundaries_set = true;
                return;
            }
        }
        
        self.handle_cursor_click = creation_second_handle_cursor_click;
    }
    
    this.handle_cursor_move = function(_) {} 
    
    this.draw = function(context) {
        // save state
        context.save();

        //console.log("Drawing ellipse...");

        context.beginPath();

        // Below, use to draw reference points to the 4 boundary points
        // NOTE: Can be used for m_control_points??
        // context.moveTo(m_origin.x, m_origin.y);
        // context.lineTo(q1_boundary.x, q1_boundary.y);

        // context.moveTo(m_origin.x, m_origin.y);
        // context.lineTo(q2_boundary.x, q2_boundary.y);

        // context.moveTo(m_origin.x, m_origin.y);
        // context.lineTo(q3_boundary.x, q3_boundary.y);

        // context.moveTo(m_origin.x, m_origin.y);
        // context.lineTo(q4_boundary.x, q4_boundary.y);

        //context.moveTo(q4_boundary.x, q4_boundary.y);        
        //context.lineTo(q1_boundary.x, q1_boundary.y);

        context.lineWidth = 5;
        context.strokeStyle = 'black';

        // Method 1: Draw Ellipse based on Bezier Curves
        //context.moveTo(q3_boundary.x, q3_boundary.y + (q1_boundary.y - q3_boundary.y) / 2);
        //context.bezierCurveTo(q3_boundary.x, q3_boundary.y, q1_boundary.x, q3_boundary.y, q1_boundary.x, q3_boundary.y + (q1_boundary.y - q3_boundary.y) / 2);
        //context.bezierCurveTo(q1_boundary.x, q1_boundary.y, q3_boundary.x, q1_boundary.y, q3_boundary.x, q3_boundary.y + (q1_boundary.y - q3_boundary.y) / 2);


        // Method 2: Draw Ellipse based on CanvasRenderingContext2D.ellipse()

        context.ellipse(m_origin.x, m_origin.y, m_major_vertex, m_minor_vertex, 0, 0, 2*Math.PI);
        context.stroke();
        context.closePath();
        context.restore();

    }

    // Function that indicates a change to edit mode.
    this.enable_editing = function() {
        self.highlight();
        m_control_points.push(new EllipseTranslationControlPoint());
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
            m_control_points.push(new EllipseEndControlPoint());
            // effectively sets a reference
            array_last(m_control_points).set_parent_point(array[index], index);
        });
    }
    this.unhighlight = function() {
        m_control_points = [];
    }

    this.expose = function(func) {
        var gv = func({ type : "Ellipse", points : m_origin, m_vertex });
        if (gv === undefined) return;
        m_origin = gv.points[0];
        m_vertex = gv.points[1];
        this.disable_editing();
        this.enable_editing();
    }
}

/***********************************************
    Running list of bugs
        1) Double clicking
        2) Control Points not implemented. Perhaps that's how we can rotate the ellipse?
***********************************************/