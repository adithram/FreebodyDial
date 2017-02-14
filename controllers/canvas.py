from flask import *

canvas = Blueprint('canvas', __name__, template_folder='templates')

@canvas.route('/canvas')
def canvas_route():
    return render_template("canvas.html")
    
