from flask import *


main = Blueprint('main', __name__, template_folder='templates')

@main.route('/', methods=["GET", "POST"])
def main_route():

    if request.method == "GET":
        return render_template("index.html")


    if request.method == "POST":

        content = request.json
        print ("wow")
        print (content)
        print ("it worked")
        return render_template("index.html")



