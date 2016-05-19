'use strict';

var config = {
  isFlattifyArray: false
};

var parseJSON = function (string) {
  try {
    return JSON.parse(string);
  } catch (e) {
    return string;
  }
};

var execute = function (json, parent, flattenJson) {
  var flattenJson = flattenJson || {};

  for (var property in json) {
    if (property !== null) {
      switch (Object.prototype.toString.call(json[property])) {
        case '[object Array]':
          if (config.isFlattifyArray) {
            execute(json[property], parent ? parent + '.' + property : property, flattenJson);
          } else {
            flattenJson[property] = JSON.stringify(json[property]);
          }
          break;
        case '[object Object]':
          execute(json[property], parent ? parent + '.' + property : property, flattenJson);
          break;
        default:
          flattenJson[parent? parent + '.' + property : property] = json[property];
      }
    }
  }

  return flattenJson;
};

var isArray = function (json) {
  return Object.prototype.toString.call(json) === '[object Array]';
};

var flattify = function (json, isFlattifyArray) {
  config.isFlattifyArray = !!isFlattifyArray;
  json = parseJSON(json);
  
  if (!isArray(json))
    return execute(json);

  var array = [];

  json.forEach(function (item) {
    array.push(execute(item));
  });

  return array;
};

module.exports = flattify;
