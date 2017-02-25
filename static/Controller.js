"use strict";
/** The 'Cursor' Object is the actual Controller (due for renaming?). Other 
 *  'controllers' keep track of events that occur in the program, and then 
 *  updates this object.
 * 
 *  Not to be confused with the mouse cursor. The cursor is an abstraction; it 
 *  is the point on screen which may receive click events. Its location may 
 *  convey user will.
 * 
 *  @note user will -> as in user will so far as we can ascertain from input 
 *        json/mouse/keyboard or otherwise
 */
function Controller() {
    assert_new.check(this);
    
    var m_min_speed           = 200;
    var m_max_dbl_click_delay = 0.1;
    
    var m_cursor_location  = zero_vect();
    var m_cursor_direction = zero_vect();
    var m_cursor_velocity  = zero_vect();
    
    var m_time_since_previous_click = 0;
    var m_click_was_held = false; // history
    var m_click_held = false;
    
    var m_location_change_event = undefined;
    var m_just_clicked_event    = undefined;
    var m_just_released_event   = undefined;
    var m_click_held_event      = undefined;
    var m_double_click_event    = undefined;
    
    var throw_if_param_not_func = function(func) {
        if (!$.isFunction(func))
            throw "func parameter must be a function";
    }
    
    this.location = function() { return m_cursor_location; }
    
    this.is_pressed = function() { return m_click_held; }

    this.as_read_only = function() {
        return new function(loc_, is_pres_) {
            var loc     = loc_    ;
            var is_pres = is_pres_;
            this.location   = function() { return loc    ; }
            this.is_pressed = function() { return is_pres; }
            
        }(this.location(), this.is_pressed());
    }
    
    this.set_location = function(v) {
        m_cursor_location = v;
        console.log('set_location');
        if (m_location_change_event !== undefined)
            m_location_change_event();
    }
    
    this.move_in_direction = function(dir) {
        m_cursor_direction = dir;
    }
    
    this.set_pressed = function(pressed) {
        m_click_was_held = m_click_held;
        m_click_held     = pressed     ;
        if (m_click_held && m_click_was_held) {
            m_click_held_event();
        } else if (m_click_held && !m_click_was_held) {
            m_just_clicked_event();
        } else if (!m_click_held && m_click_was_held) {
            m_just_released_event();
        }
    }
    
    this.do_time_based_updates = function(et) {
        // for move controls
        var mul   = function(s, v) { return { x:s*v.x, y:s*v.y }; };
        var add   = Vector.add;
        var mag   = Vector.mag;
        var norm  = Vector.norm;

        if (mag(m_cursor_direction) !== 0) {
            // perhaps add an accelerating cursor?
            m_cursor_location = add(m_cursor_location, mul(m_min_speed*et, m_cursor_direction));
            m_cursor_direction = zero_vect();
            m_location_change_event();
        }
        
        if (m_click_held && m_click_was_held)
            m_click_held_event();
    }
    
    this.reset_events = function() {
        m_location_change_event = function(){};
        m_just_clicked_event    = function(){};
        m_just_released_event   = function(){};
        m_click_held_event      = function(){};
        m_double_click_event    = function(){};
    }
    this.reset_events();
    
    this.set_location_change_event = function(func) { 
        throw_if_param_not_func(func);
        m_location_change_event = func; 
    }
    
    this.set_just_clicked_event = function(func) {
        throw_if_param_not_func(func);
        m_just_clicked_event = func;
    }
    
    this.set_click_held_event = function(func) {
        throw_if_param_not_func(func);
        m_click_held_event = func;
    }
    
    this.set_just_released_event = function(func) {
        throw_if_param_not_func(func);
        m_just_released_event = func; 
    }
    
    this.set_double_click_event = function(func) {
        throw_if_param_not_func(func);
        m_double_click_event = func;
    }
}
