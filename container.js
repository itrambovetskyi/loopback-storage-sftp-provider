const { Container } = require('pkgcloud').storage;


class SSHContainer extends Container {

  constructor(client, details) {
    super(client, details)
  }

  _setProperties(details) {
    for (let k in details) {
      if (typeof details[k] !== 'function') {
        this[k] = details[k];
      }
    }
  };
}


module.exports = SSHContainer;