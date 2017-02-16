from flask import Flask, render_template, session
import controllers
import config

# Initialize Flask app with the template folder address
app = Flask(__name__, template_folder='templates')

# Register the controllers
app.register_blueprint(controllers.main)

app.secret_key = "\x94W\xc0,\x98\xe4\x80\xb6\xc2Q\xbc\xf6\xbb^\x14hx\x9fj\x11\x18(\xb8B"




# Listen on external IPs
# For us, listen to port 3000 so you can just run 'python app.py' to start the server
if __name__ == '__main__':
    # listen on external IPs
    app.run(host=config.env['host'], port=config.env['port'], debug=True)
    #socketio.run(app)

    app.register_blueprint(controllers.canvas)
	#app.register_blueprint(controllers.input_json)
	