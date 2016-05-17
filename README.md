# [Flattify](https://github.com/NandoMB/flattify)

Convert JSON to "Flat JSON".
<br>
<br>
## Getting Started
#### Installation
```sh
$ npm install flattify --save
```
<br>
#### How to use...
```js
var flattify = require('./flattify');
```
<br>
<br>
##### flattify(json);
Using with only the first parameter, only objects will be converted.
Arrays will be transformed to string.
<br />
```js
var flattify = require('./flattify');

var json = {
  "id": 1,
  "gender": "Male",
  "first": "Joshua",
  "last": "Williams",
  "emails": [
    "jwilliams1@vkontakte.ru",
    "phowell1@ezinearticles.com",
    "aferguson2@pen.io"
  ],
  "addresses": [
    {
      "street": "Anzinger Court",
      "number": 73902
    },
    {
      "street": "Anthes Parkway",
      "number": 106
    }
  ]
};

var flattenJson = flattify(json);
console.log(flattenJson);
```
<br>
Result:
```js
{
  "id": 1,
  "gender": "Male",
  "first": "Joshua",
  "last": "Williams",
  "emails": "[\"jwilliams1@vkontakte.ru\",\"phowell1@ezinearticles.com\",\"aferguson2@pen.io\"]",
  "addresses": "[{\"street\":\"Anzinger Court\",\"number\":73902},{\"street\":\"Anthes Parkway\",\"number\":106}]"
}
```
<br>
<br>
#### flattify(json, true);
Using with the first and second parameter, all objects and arrays will be converted.
<br />
```js
var flattify = require('./flattify');

var json = {
  "id": 1,
  "gender": "Male",
  "first": "Joshua",
  "last": "Williams",
  "emails": [
    "jwilliams1@vkontakte.ru",
    "phowell1@ezinearticles.com",
    "aferguson2@pen.io"
  ],
  "addresses": [
    {
      "street": "Anzinger Court",
      "number": 73902
    },
    {
      "street": "Anthes Parkway",
      "number": 106
    }
  ]
};

var flattenJson = flattify(json, true);
console.log(flattenJson);
```
<br>
Result:
```js
{
  "id": 1,
  "gender": "Male",
  "first": "Joshua",
  "last": "Williams",
  "emails.0": "jwilliams1@vkontakte.ru",
  "emails.1": "phowell1@ezinearticles.com",
  "emails.2": "aferguson2@pen.io",
  "addresses.0.street": "Anzinger Court",
  "addresses.0.number": 73902,
  "addresses.1.street": "Anthes Parkway",
  "addresses.1.number": 106
}
```
<br>
## License
The MIT License (MIT)

Copyright (c) 2016 Fernando Machado Bernardino
[NandoMB](https://github.com/NandoMB). https://github.com/NandoMB/flattify

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
