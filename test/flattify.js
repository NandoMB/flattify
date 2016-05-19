'use strict'

var flattify = require('../lib/flattify.js');
var should = require('chai').should();
var path = require('path');
var fs = require('fs');


describe('When execute flattify,', function () {
  var objectMock, arrayMock, getMock;

  before(function() {
    getMock = function (name, charset) {
      return fs.readFileSync(path.join(__dirname, 'mocks/' + name), charset);
    };

    objectMock = getMock('object.json', 'UTF-8');
    arrayMock = getMock('array.json', 'UTF-8');
  });

  describe('whith only first parameter:', function () {
    describe('passing a json:', function () {
      it('object', function (done) {
        var result = flattify(objectMock);
        result['id'].should.equal(1);
        result['gender'].should.equal('Male');
        result['first'].should.equal('Joshua');
        result['last'].should.equal('Williams');
        result['emails'].should.equal('[\"jwilliams1@vkontakte.ru\",\"phowell1@ezinearticles.com\",\"aferguson2@pen.io\"]');
        result['addresses'].should.equal('[{\"street\":\"Anzinger Court\",\"number\":73902},{\"street\":\"Anthes Parkway\",\"number\":106}]');
        done();
      });

      it('array', function (done) {
        var result = flattify(arrayMock);

        result[0]['id'].should.equal(1);
        result[0]['gender'].should.equal('Male');
        result[0]['first'].should.equal('Joshua');
        result[0]['last'].should.equal('Williams');
        result[0]['emails'].should.equal('[\"jwilliams1@vkontakte.ru\",\"phowell1@ezinearticles.com\",\"aferguson2@pen.io\"]');
        result[0]['addresses'].should.equal('[{\"street\":\"Anzinger Court\",\"number\":73902},{\"street\":\"Anthes Parkway\",\"number\":106}]');

        result[1]['id'].should.equal(2);
        result[1]['gender'].should.equal('Male');
        result[1]['first'].should.equal('Joshua');
        result[1]['last'].should.equal('Williams');
        result[1]['emails'].should.equal('[\"jwilliams1@vkontakte.ru\",\"phowell1@ezinearticles.com\",\"aferguson2@pen.io\"]');
        result[1]['addresses'].should.equal('[{\"street\":\"Anzinger Court\",\"number\":73902},{\"street\":\"Anthes Parkway\",\"number\":106}]');
        done();
      });
    });

    describe('passing a javascript:', function () {
      it('object', function (done) {
        var result = flattify(JSON.parse(objectMock));
        result['id'].should.equal(1);
        result['gender'].should.equal('Male');
        result['first'].should.equal('Joshua');
        result['last'].should.equal('Williams');
        result['emails'].should.equal('[\"jwilliams1@vkontakte.ru\",\"phowell1@ezinearticles.com\",\"aferguson2@pen.io\"]');
        result['addresses'].should.equal('[{\"street\":\"Anzinger Court\",\"number\":73902},{\"street\":\"Anthes Parkway\",\"number\":106}]');
        done();
      });

      it('array', function (done) {
        var result = flattify(JSON.parse(arrayMock));

        result[0]['id'].should.equal(1);
        result[0]['gender'].should.equal('Male');
        result[0]['first'].should.equal('Joshua');
        result[0]['last'].should.equal('Williams');
        result[0]['emails'].should.equal('[\"jwilliams1@vkontakte.ru\",\"phowell1@ezinearticles.com\",\"aferguson2@pen.io\"]');
        result[0]['addresses'].should.equal('[{\"street\":\"Anzinger Court\",\"number\":73902},{\"street\":\"Anthes Parkway\",\"number\":106}]');

        result[1]['id'].should.equal(2);
        result[1]['gender'].should.equal('Male');
        result[1]['first'].should.equal('Joshua');
        result[1]['last'].should.equal('Williams');
        result[1]['emails'].should.equal('[\"jwilliams1@vkontakte.ru\",\"phowell1@ezinearticles.com\",\"aferguson2@pen.io\"]');
        result[1]['addresses'].should.equal('[{\"street\":\"Anzinger Court\",\"number\":73902},{\"street\":\"Anthes Parkway\",\"number\":106}]');
        done();
      });
    });
  });

  describe('with both parameters:', function () {
    describe('passing a json:', function () {
      it('object', function (done) {
        var result = flattify(objectMock, true);
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

      it('array', function (done) {
        var result = flattify(arrayMock, true);
        result[0]['id'].should.equal(1);
        result[0]['gender'].should.equal('Male');
        result[0]['first'].should.equal('Joshua');
        result[0]['last'].should.equal('Williams');
        result[0]['emails.0'].should.equal('jwilliams1@vkontakte.ru');
        result[0]['emails.1'].should.equal('phowell1@ezinearticles.com');
        result[0]['emails.2'].should.equal('aferguson2@pen.io');
        result[0]['addresses.0.street'].should.equal('Anzinger Court');
        result[0]['addresses.0.number'].should.equal(73902);
        result[0]['addresses.1.street'].should.equal('Anthes Parkway');
        result[0]['addresses.1.number'].should.equal(106);

        result[1]['id'].should.equal(2);
        result[1]['gender'].should.equal('Male');
        result[1]['first'].should.equal('Joshua');
        result[1]['last'].should.equal('Williams');
        result[1]['emails.0'].should.equal('jwilliams1@vkontakte.ru');
        result[1]['emails.1'].should.equal('phowell1@ezinearticles.com');
        result[1]['emails.2'].should.equal('aferguson2@pen.io');
        result[1]['addresses.0.street'].should.equal('Anzinger Court');
        result[1]['addresses.0.number'].should.equal(73902);
        result[1]['addresses.1.street'].should.equal('Anthes Parkway');
        result[1]['addresses.1.number'].should.equal(106);
        done();
      });
    });

    describe('passing a javascript:', function () {
      it('object', function (done) {
        var result = flattify(JSON.parse(objectMock), true);
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

      it('array', function (done) {
        var result = flattify(JSON.parse(arrayMock), true);
        result[0]['id'].should.equal(1);
        result[0]['gender'].should.equal('Male');
        result[0]['first'].should.equal('Joshua');
        result[0]['last'].should.equal('Williams');
        result[0]['emails.0'].should.equal('jwilliams1@vkontakte.ru');
        result[0]['emails.1'].should.equal('phowell1@ezinearticles.com');
        result[0]['emails.2'].should.equal('aferguson2@pen.io');
        result[0]['addresses.0.street'].should.equal('Anzinger Court');
        result[0]['addresses.0.number'].should.equal(73902);
        result[0]['addresses.1.street'].should.equal('Anthes Parkway');
        result[0]['addresses.1.number'].should.equal(106);

        result[1]['id'].should.equal(2);
        result[1]['gender'].should.equal('Male');
        result[1]['first'].should.equal('Joshua');
        result[1]['last'].should.equal('Williams');
        result[1]['emails.0'].should.equal('jwilliams1@vkontakte.ru');
        result[1]['emails.1'].should.equal('phowell1@ezinearticles.com');
        result[1]['emails.2'].should.equal('aferguson2@pen.io');
        result[1]['addresses.0.street'].should.equal('Anzinger Court');
        result[1]['addresses.0.number'].should.equal(73902);
        result[1]['addresses.1.street'].should.equal('Anthes Parkway');
        result[1]['addresses.1.number'].should.equal(106);
        done();
      });
    });
  });
});
