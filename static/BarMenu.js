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

/** Represents a 'quick and dirty' menu. For prototyping purposes. Hopefully
 *  we can use HTML to create a more professional interface.
 * 
 *  Which didn't seem to have happened :c
 */
function BarMenu() {
    assert_new.check(this);
    
    // Contains the various menu options
    var m_entries = [];
    // Used to see whether change in click as occured
    var m_previous_press = undefined;
    // will have to be constant relative to the diagram
    var m_location = zero_vect();
    var m_size     = zero_vect();
    var self = this;
    
    // Function that handles clicks within the menu bar
    var handle_click_inside = function(entry) {
        // Asserts that the current click is different than the previous click. 
        // A change has occured
        // if (m_previous_press !== entry) {
        //     if (m_previous_press !== undefined)
        //         m_previous_press.on_mode_exit(entry, m_previous_press);
        //     entry.callback(entry);
        // }

        if (m_previous_press !== undefined)
            m_previous_press.on_mode_exit(entry, m_previous_press);
        entry.callback(entry);
        // Reset the previous press
        m_previous_press = entry;
    }
    
    // Function used to add operations to menu bar with respective functionality.
    this.push_entry = function(text_, callback_) {
        m_entries.push({ text: text_, callback: callback_,
                         on_mode_exit: function(_){} });
        return self;
    }
    
    this.set_last_added_entry_as_default = function() {
        if (m_previous_press !== undefined) {
            throw "Already set default menu entry!";
        }
        array_last(m_entries).callback(array_last(m_entries));
        m_previous_press = array_last(m_entries);
    }
    
    // Function that checks the cursor position within the menu bar for a single entry
    this.check_click = function(cursor) {
        if (m_entries.length === 0) return false;
        if (m_entries[0].bounds === undefined) return false;
        var rv = false;
        m_entries.forEach(function(entry) {
            if (Vector.in_bounds(cursor, entry.bounds)) {
                handle_click_inside(entry);
                rv = true;   // for entire member function
                return true; // breaks out of forEach
            }
        });
        return rv;
    }
    
    // I wish I could do this with regular HTML elements, it would be soooo
    // much easier and allow fancier graphics
    // this function DOES modify the state of the object
    // Physically creates the menu bar
    this.draw = function(context) {


        var draw_position = deepcopy(m_location);

        var initial_x = 0;

        // Find window width and height - used for dynamic resizing
        var window_width = $(window).width();
        var window_height = $(window).height();
        
        m_size = zero_vect();
        // Modify the font size based on window size - used for dynamic resizing
        context.font = (window_height / 36)+"px Arial";
        context.lineWidth = 1;
        context.strokeStyle = 'black';

        var num_entries = m_entries.length;
        var cuttoff_point = num_entries/2;
        var count = 0;

        var second_row_y = -1;

        // Iterate through each entry or menu option
        m_entries.forEach(function(entry) { 
            console.log("Count: " + count + "with x_pos: " + draw_position.x + " and y_pos : " + draw_position.y);

            count = count + 1;

            if(count == cuttoff_point + 1){
                //draw_position.y = entry_size.y;
                draw_position.x = initial_x;
                draw_position.y = second_row_y
                m_size = zero_vect();

            }

            //Declare static size for each entry. Size changes depending on window size. 
            var entry_size = { x: (window_width / m_entries.length)*2,
                               y: parseInt(context.font) + window_height / 12 };
            // update entry bounds
            entry.bounds = { x    : draw_position.x, y     : draw_position.y,
                             width: entry_size.x   , height: entry_size.y    };

            if(entry_size.y){
                second_row_y = entry_size.y;
            }
            
            // draw box around entry
            context.beginPath();
            if (m_previous_press === entry) {
                context.fillStyle = 'yellow';
            } else {
                context.fillStyle = 'white';
            }
            context.fillRect(draw_position.x, draw_position.y, entry_size.x, entry_size.y);
            context.rect(draw_position.x, draw_position.y, entry_size.x, entry_size.y);
            context.stroke();
            
            // entry text
            context.fillStyle = 'black';
            
            // Variables containing witdth of text, width of box, and the position of the beginning of the text
            // Position indicates a centered position
            var text_width = context.measureText(entry.text).width;
            var box_width = window_width /(m_entries.length/2);
            var position =  (box_width - text_width) / 2;

            var getTextHeight = function(font) {

              var text = $('<span>Hg</span>').css({ fontFamily: font });
              var block = $('<div style="display: inline-block; width: 1px; height: 0px;"></div>');

              var div = $('<div></div>');
              div.append(text, block);

              var body = $('body');
              body.append(div);

              try {

                var result = {};

                block.css({ verticalAlign: 'baseline' });
                result.ascent = block.offset().top - text.offset().top;

                block.css({ verticalAlign: 'bottom' });
                result.height = block.offset().top - text.offset().top;

                result.descent = result.height - result.ascent;

              } finally {
                div.remove();
              }

              return result;
            };

            var text_height = getTextHeight(context.font).height;
            var box_height = entry_size.y;
            var y_position = ( ((box_height - text_height)/2) + (box_height - text_height) )/2;
            
            // Fill box with text at the right position
            context.fillText(entry.text, 
                             draw_position.x + position, 
                             draw_position.y + y_position);

            

            // Move to handle the next entry
            m_size.x += entry_size.x;
            draw_position.x += entry_size.x;
        });
    }
}
