'use strict'

var flattify = require('../lib/flattify.js');
var should = require('chai').should();
var path = require('path');
var fs = require('fs');


describe('When execute flattify,', function () {
  var mock, getMock;

  before(function() {
    getMock = function (name, charset) {
      return fs.readFileSync(path.join(__dirname, 'mocks/' + name), charset);
    };
    mock = getMock('initial.json', 'UTF-8');
  });

  describe('Whith only first parameter:', function () {
    it('passing a JSON (string)', function (done) {
      var result = flattify(mock);
      result['id'].should.equal(1);
      result['gender'].should.equal('Male');
      result['first'].should.equal('Joshua');
      result['last'].should.equal('Williams');
      result['emails'].should.equal('[\"jwilliams1@vkontakte.ru\",\"phowell1@ezinearticles.com\",\"aferguson2@pen.io\"]');
      result['addresses'].should.equal('[{\"street\":\"Anzinger Court\",\"number\":73902},{\"street\":\"Anthes Parkway\",\"number\":106}]');
      done();
    });
    it('passing an object', function (done) {
      var result = flattify(JSON.parse(mock));
      result['id'].should.equal(1);
      result['gender'].should.equal('Male');
      result['first'].should.equal('Joshua');
      result['last'].should.equal('Williams');
      result['emails'].should.equal('[\"jwilliams1@vkontakte.ru\",\"phowell1@ezinearticles.com\",\"aferguson2@pen.io\"]');
      result['addresses'].should.equal('[{\"street\":\"Anzinger Court\",\"number\":73902},{\"street\":\"Anthes Parkway\",\"number\":106}]');
      done();
    });
  });
  describe('With both parameters:', function () {
    it('passing a JSON (string)', function (done) {
      var result = flattify(mock, true);
      result['id'].should.equal(1);
      result['gender'].should.equal('Male');
      result['first'].should.equal('Joshua');
      result['last'].should.equal('Williams');
      result['emails.0'].should.equal('jwilliams1@vkontakte.ru');
      result['emails.1'].should.equal('phowell1@ezinearticles.com');
      result['emails.2'].should.equal('aferguson2@pen.io');
      result['addresses.0.street'].should.equal('Anzinger Court');
      result['addresses.0.number'].should.equal(73902);
      result['addresses.1.street'].should.equal('Anthes Parkway');
      result['addresses.1.number'].should.equal(106);
      done();
    });
    it('passing an object', function (done) {
      var result = flattify(JSON.parse(mock), true);
      result['id'].should.equal(1);
      result['gender'].should.equal('Male');
      result['first'].should.equal('Joshua');
      result['last'].should.equal('Williams');
      result['emails.0'].should.equal('jwilliams1@vkontakte.ru');
      result['emails.1'].should.equal('phowell1@ezinearticles.com');
      result['emails.2'].should.equal('aferguson2@pen.io');
      result['addresses.0.street'].should.equal('Anzinger Court');
      result['addresses.0.number'].should.equal(73902);
      result['addresses.1.street'].should.equal('Anthes Parkway');
      result['addresses.1.number'].should.equal(106);
      done();
    });
  });

});
