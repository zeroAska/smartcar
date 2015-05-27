# -*- coding: utf-8 -*-
from flask import Flask
from flask.ext.sqlalchemy import SQLAlchemy
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql://smart:smart_car@202.120.54.218/sbma'
db = SQLAlchemy(app)

import models
import views
