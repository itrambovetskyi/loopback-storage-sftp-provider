const connect = require('ssh2-connect');
const fs = require('ssh2-fs');
const EventEmitter = require(`events`);
const util = require('util');


/**
 *
 */
class FSSSH extends EventEmitter {

    /**
     *
     * @param host
     * @param port
     * @param username
     * @param password
     */
    constructor({ host, port, username, password }) {
        super();

        this._isReady = false;
        this._ee = new EventEmitter();
        this._ssh = null;

        connect({ host, port, username, password }, (err, ssh) => {
            if(err) {
                this._isReady = false;
                this.emit(`error`, err);
            } else {
                this._ssh = ssh;
                this._isReady = true;
                this._ee.emit(`ready`);
            }
        });
    }

    /**
     *
     * @returns {Promise<*|undefined>}
     * @private
     */
    async _waitWhileNotReady() {
        if (!this._isReady) {
            return new Promise((resolve) => {
                if (this._isReady) {
                    resolve();
                } else {
                    this._ee.on(`ready`, resolve);
                }
            });
        }
    }

    /**
     *
     * @param path
     * @param mode
     * @returns {Promise<any>}
     */
    async chmod(path, mode) {
        await this._waitWhileNotReady();
        return util.promisify(fs.chmod)(this._ssh, path, mode);
    }

    /**
     *
     * @param path
     * @param uid
     * @param gid
     * @returns {Promise<any>}
     */
    async chown(path, uid, gid) {
        await this._waitWhileNotReady();
        return util.promisify(fs.chown)(this._ssh, path, uid, gid);
    }

    /**
     *
     * @param path
     * @returns {Promise<any>}
     */
    async exists(path) {
        await this._waitWhileNotReady();
        return util.promisify(fs.exists)(this._ssh, path);
    }

    /**
     * @param path
     * @param atime
     * @param mtime
     * @returns {Promise<any>}
     */
    async futimes(path, atime, mtime) {
        await this._waitWhileNotReady();
        return util.promisify(fs.futimes)(this._ssh, path, atime, mtime);
    }

    /**
     *
     * @param path
     * @returns {Promise<any>}
     */
    async lstat(path) {
        await this._waitWhileNotReady();
        return util.promisify(fs.lstat)(this._ssh, path);
    }

    /**
     *
     * @param path
     * @param options
     * @returns {Promise<any>}
     */
    async mkdir(path, options) {
        await this._waitWhileNotReady();
        return util.promisify(fs.mkdir)(this._ssh, path, options);
    }

    /**
     *
     * @param path
     * @returns {Promise<any>}
     */
    async readdir(path) {
        await this._waitWhileNotReady();
        return util.promisify(fs.readdir)(this._ssh, path);
    }

    /**
     *
     * @param path
     * @param options
     * @returns {Promise<any>}
     */
    async readFile(path, options) {
        await this._waitWhileNotReady();
        return util.promisify(fs.readFile)(this._ssh, path, options);
    }

    /**
     *
     * @param path
     * @returns {Promise<any>}
     */
    async readlink(path) {
        await this._waitWhileNotReady();
        return util.promisify(fs.readlink)(this._ssh, path);
    }

    /**
     *
     * @param source
     * @param target
     * @returns {Promise<any>}
     */
    async rename(source, target) {
        await this._waitWhileNotReady();
        return util.promisify(fs.rename)(this._ssh, source, target);
    }

    /**
     *
     * @param target
     * @returns {Promise<any>}
     */
    async rmdir(target) {
        await this._waitWhileNotReady();
        return util.promisify(fs.rmdir)(this._ssh, target);
    }

    /**
     *
     * @param path
     * @returns {Promise<any>}
     */
    async stat(path) {
        await this._waitWhileNotReady();
        return util.promisify(fs.stat)(this._ssh, path);
    }

    /**
     *
     * @param srcPath
     * @param dstPath
     * @returns {Promise<any>}
     */
    async symlink(srcPath, dstPath) {
        await this._waitWhileNotReady();
        return util.promisify(fs.symlink)(this._ssh, srcPath, dstPath);
    }

    /**
     *
     * @param path
     * @returns {Promise<any>}
     */
    async unlink(path) {
        await this._waitWhileNotReady();
        return util.promisify(fs.unlink)(this._ssh, path);
    }

    /**
     *
     * @param source
     * @param content
     * @param options
     * @returns {Promise<any>}
     */
    async writeFile(source, content, options) {
        await this._waitWhileNotReady();
        return util.promisify(fs.writeFile)(this._ssh, source, content, options);
    }

    /**
     *
     * @param source
     * @param options
     * @returns {Promise<any>}
     */
    createReadStream(source, options) {
        return fs.createReadStream(this._ssh, source, options);
    }

    /**
     *
     * @param path
     * @param options
     * @returns {Promise<any>}
     */
    createWriteStream(path, options) {
        return fs.createWriteStream(this._ssh, path, options);
    }
}


module.exports = FSSSH;