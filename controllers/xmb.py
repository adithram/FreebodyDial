from flask import *

xmb = Blueprint('canvas', __name__, template_folder='templates')

@xmb.route('/XMB')
def xmb_route():
    return render_template("XMB/index.html")
    
