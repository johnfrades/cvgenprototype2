var express = require('express');
var router = express.Router();
var Student = require('../models/student');
var AuthKey = require('../models/authkey');
var async = require('async');
var crypto = require('crypto');
var nodemailer = require('nodemailer');


router.get('/allstudent', function(req, res){
	Student.find({}, function(err, allStudent){
		if(err){
			console.log(err);
		} else {
			res.send(allStudent);
		}
	});
});


router.get('/student', function(req, res){
	res.render('student');
});


router.post('/register', function(req, res){
	var theStudentInfo = req.body.student;
	var newStudent = new Student(theStudentInfo);

	Student.register(newStudent, req.body.thepassword, function(err, registerStudent){
		console.log(registerStudent);
		if(err){
			console.log(err);
		} else {
			AuthKey.findOneAndUpdate({'studentid': theStudentInfo.username}, {$set: {'used': true}}, function(err, Updated){
				if(err){
					console.log(err);
				} else {
					res.send(registerStudent);
				}
			});
		}
	});
});



router.post('/signup', function(req, res) {
  var theStudent = new Student({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      fullname: req.body.fullname,
      authkey: req.body.authkey
    });
  AuthKey.findOneAndUpdate({'studentid': req.body.username}, {$set: {'used': true}}, function(err, Updated){
  	if(err){
  		console.log(err);
  	} else {
   		theStudent.save(function(err) {
    	req.logIn(theStudent, function(err) {
      	res.redirect('/');
   		});
 	 });
  	}
  });
});



router.get('/reset/:token', function(req, res) {
  Student.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset');
  });
});


router.post('/forgot', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      Student.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        user.fullname = 'John Lois';

        console.log(user.resetPasswordToken);
        console.log(user.resetPasswordExpires);
        console.log('---------------------------------');
        console.log(token);
        console.log(Date.now() + 3600000);
        console.log('---------------------------------');
        console.log(user);

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var transporter = nodemailer.createTransport('SMTP', {
        service: 'SendGrid',
        auth: {
          user: 'johnfrads',
          pass: 'Gathering0936'
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'passwordreset@demo.com',
        subject: 'Node.js Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
           'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n' +
          'This link will expire in 1 hour!'
      };
      transporter.sendMail(mailOptions, function(err) {
        // req.flash('info', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/');
  });
});



router.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      Student.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        user.save(function(err) {
          req.logIn(user, function(err) {
            done(err, user);
          });
        });
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport('SMTP', {
        service: 'SendGrid',
        auth: {
          user: 'johnfrads',
          pass: 'Gathering0936'
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'passwordreset@demo.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        // req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/');
  });
});





module.exports = router;