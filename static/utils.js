"use strict";

// on reflection: I perhaps should've used a geometry library as opposed to 
//                reinventing the wheel, and wasting time
//                DrawIO's API does what canvas does...

var assert_new = {
    global_this : this,
    check : function(this_) {
        if (this_ === this.global_this)
            throw "You must use \"new\" to create new objects.";
    }
};

Object.freeze(assert_new);

function assert_not_nan(f) { if (f != f) throw "Nan!"; }

function array_last(arr) { return arr[arr.length - 1]; }

function array_clean(arr) {
    var rv = [];
    for_each(arr, function(entry) {
        if (entry)
            rv.push(entry);
    });
    return rv;
};

function array_trim(arr, condition) {
    var modify_array = function(arr) { return arr };
    for (var i = 0; i < arr.length; ++i) {
        if (condition(arr[i])) {
            delete arr[i];
            modify_array = array_clean;
        }
    }
    return modify_array(arr);
}

function array_trim_first(arr, condition) {
    // DRY violation, but how can I cleanly avoid this here?
    var modify_array = function(arr) { return arr };
    for (var i = 0; i < arr.length; ++i) {
        if (condition(arr[i])) {
            delete arr[i];
            modify_array = array_clean;
            break;
        }
    }
    return modify_array(arr);
}

var Vector = {
    mag : function(v) {
        return Math.sqrt(v.x*v.x + v.y*v.y);
    },
    angle_between : function(u, v) {
        var dot_prod = u.x*v.x + u.y*v.y;
        return Math.acos(dot_prod/(this.mag(u)*this.mag(v)));
    },
    to_string : function(v) {
        return "(x: " + v.x + " y: " + v.y + " )";
    },
    norm : function(v) {
        return { x: v.x/this.mag(v), y: v.y/this.mag(v) };
    },
    add : function(v, u) {
        return { x: v.x + u.x, y: v.y + u.y };
    },
    sub : function(v, u) {
        return { x: v.x - u.x, y: v.y - u.y };
    },
    in_bounds : function(v, bounds) {
        return v.x > bounds.x && v.x < bounds.x + bounds.width &&
               v.y > bounds.y && v.y < bounds.y + bounds.height;
    },
    bounds_around : function(point, size_vect) {
        return { x: point.x - size_vect.x/2, 
                 y: point.y - size_vect.y/2,
                 width : size_vect.x, 
                 height: size_vect.y };
    },
    distance : function(u, v) { return this.mag(this.sub(u, v)); }
}

Object.freeze(Vector);

var g_this = this;

function zero_vect() { return { x: 0, y: 0 }; }

function deepcopy(obj) { return $.extend(true, {}, obj); }

function draw_bounds_as_black_outlined_box(context, cp_bounds, fill_color) {
    context.beginPath();
    context.rect(cp_bounds.x, cp_bounds.y, cp_bounds.width, cp_bounds.height);
    context.fillStyle = fill_color;
    context.fill();
    context.lineWidth = 1;
    context.strokeStyle = 'black';
    context.stroke();
}

function for_each(array, callback) {
    for (var i = 0; i < array.length; ++i) {
        var wants_break = callback(array[i]);
        if (wants_break !== undefined) {
            if (wants_break === true)
                return;
        }
    }
}
