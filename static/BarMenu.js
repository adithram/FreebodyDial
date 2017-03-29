"use strict";
/** Represents a 'quick and dirty' menu. For prototyping purposes. Hopefully
 *  we can use HTML to create a more professional interface.
 * 
 */
function BarMenu() {
    assert_new.check(this);
    
    var m_entries = [];
    var m_previous_press = undefined;
    // will have to be constant relative to the diagram
    var m_location = zero_vect();
    var m_size     = zero_vect();
    
    this.push_entry = function(text_, callback_) {
        m_entries.push({ text: text_, callback: callback_ });
    }
    
    this.check_click = function(cursor) {
        if (m_entries.length === 0) return false;
        if (m_entries[0].bounds === undefined) return false;
        var rv = false;
        m_entries.forEach(function(entry) {
            // ... reinventing the wheel?
            if (Vector.in_bounds(cursor, entry.bounds)) {
                if (m_previous_press !== entry)
                    entry.callback(entry);
                m_previous_press = entry;
                rv = true;
                return true; // breaks out of for_each
            }
        });
        return rv;
    }
    
    // I wish I could do this with regular HTML elements, it would be soooo
    // much easier and allow fancier graphics
    // this function DOES modify the state of the object
    this.draw = function(context) {

        // 7 objects



        var draw_position = deepcopy(m_location);
        // javascript function to find width of the page / 7
        var window_width = $(window).width();
        var window_height = $(window).height();
        
        m_size = zero_vect();
        context.font = (window_height/18)+"px Arial";
        context.lineWidth = 1;
        context.strokeStyle = 'black';
        
        var count = 0;
        m_entries.forEach(function(entry) {
            var entry_size = { x: window_width / m_entries.length, // why seven ? //context.measureText(entry.text).width,
                               y: parseInt(context.font) };
            // update entry bounds
            entry.bounds = { x    : draw_position.x, y     : draw_position.y,
                             width: entry_size.x   , height: entry_size.y    };
            
            // draw box around entry
            context.beginPath();
            if (m_previous_press === entry) {
                context.fillStyle = 'yellow';
                context.fillRect(draw_position.x, draw_position.y, entry_size.x, entry_size.y + window_height/12);
            } else {
                context.rect(draw_position.x, draw_position.y, entry_size.x, entry_size.y + window_height/12);
            }
            context.stroke();
            
            // entry text
            context.fillStyle = 'black';
            
            var text_width = context.measureText(entry.text).width;
            var box_width = window_width/7;
            var position =  ((box_width - text_width)/2) + (box_width * count)
            //++count;
            
            context.fillText(entry.text, draw_position.x + position, draw_position.y + entry_size.y)
            
            m_size.x += entry_size.x;
            draw_position.x += entry_size.x;
        });
        
    }
}
