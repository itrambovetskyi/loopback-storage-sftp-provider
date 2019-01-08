const g = require('strong-globalize')();
const path = require('path');
const stream = require('stream');
const util = require('util');
const FSSSH = require('./fs-ssh');
const File = require('./file');
const Container = require('./container');


const NAME_PATTERN = new RegExp('[^' + path.sep + '/]+');
const CONTAINS_DOT_DOT_PATHS = /(^|[\\\/])\.\.([\\\/]|$)/;


/**
 *
 */
class SFTPProvider {

    /**
     *
     * @param options
     * @returns {SFTPProvider}
     */
    static createClient(options) {
        return new SFTPProvider(options);
    }

    /**
     *
     * @param err
     */
    static defaultErrorCallback(err) {
        console.log(err);
    }

    /**
     *
     * @param name
     */
    static validateName(name) {
        if (CONTAINS_DOT_DOT_PATHS.test(name)) {
            throw new Error(g.f('Invalid name: %s', name));
        } else {
            const match = NAME_PATTERN.exec(name);

            if (!(match && match.index === 0 && match[0].length === name.length)) {
                throw new Error(g.f('{{SFTPProvider}}: Invalid name: %s', name));
            }
        }
    }

    /**
     *
     * @param stat
     * @param props
     */
    static populateMetadata(stat={}, props={}) {
        props.size = stat.size;
        props.atime = stat.atime;
        props.mtime = stat.mtime;
        props.ctime = stat.ctime;

        return props;
    }

    /**
     *
     * @param errStream
     * @param err
     * @param cb
     * @returns {*}
     */
    static streamError(errStream, err, cb=SFTPProvider.defaultErrorCallback) {
        process.nextTick(() => {
            errStream.emit('error', err);
            cb(err);
        });

        return errStream;
    }

    static normalizePath(path) {
        return path.replace(/\\/g, '/');
    }

    /**
     *
     * @param root
     * @param host
     * @param port
     * @param username
     * @param password
     */
    constructor({ root, host, port, username, password }) {
        this.fs = new FSSSH({ root, host, port, username, password });
        this.root = root;
        this.writeStreamError = SFTPProvider.streamError.bind(null, new stream.Writable());
        this.readStreamError = SFTPProvider.streamError.bind(null, new stream.Readable());
    }

    /**
     *
     * @param cb
     */
    getContainers(cb=SFTPProvider.defaultErrorCallback) {
        try {
            let files;

            this.fs.readdir(this.root)
                .then((remoteFiles) => {
                    files = remoteFiles;

                    return Promise.all((files.map((file) =>
                        this.fs.stat(SFTPProvider.normalizePath(path.join(this.root, file))))))
                        .then((fileStats) => {
                            const containers = [];

                            for (let fileStat of fileStats) {
                                if (fileStat.isDirectory()) {
                                    containers.push(new Container(this,
                                        SFTPProvider.populateMetadata(fileStat,
                                            { name: files[fileStats.indexOf(fileStat)] })));
                                }
                            }

                            cb(null, containers);
                        })
                })
                .catch((err) => cb(err));
        } catch (err) {
            cb(err);
        }
    }

    /**
     *
     * @param options
     * @param cb
     */
    createContainer(options, cb=SFTPProvider.defaultErrorCallback) {
        try {
            SFTPProvider.validateName(options.name);

            const dir = SFTPProvider.normalizePath(path.join(this.root, options.name));

            this.fs.mkdir(dir, options)
                .then(() => this.fs.stat(dir))
                .then((stats) => cb(null, new Container(this,
                        SFTPProvider.populateMetadata(stats, { name: options.name }))))
                .catch((err) => {
                    cb(err);
                });
        } catch (err) {
            cb(err);
        }
    };

    /**
     *
     * @param name
     * @param cb
     */
    destroyContainer(name, cb=SFTPProvider.defaultErrorCallback) {
        try {
            SFTPProvider.validateName(name);

            const dir = SFTPProvider.normalizePath(path.join(this.root, name));

            this.fs.readdir(dir)
                .then((files) => Promise.all(files.map((file) =>
                        this.fs.unlink(SFTPProvider.normalizePath(path.join(dir, file))))))
                .then(() => this.fs.rmdir(dir))
                .then(() => cb(null))
                .catch((err) => cb(err));
        } catch (err) {
            cb(err);
        }
    };

    /**
     *
     * @param name
     * @param cb
     */
    getContainer(name, cb=SFTPProvider.defaultErrorCallback) {
        try {
            SFTPProvider.validateName(name);

            const dir = SFTPProvider.normalizePath(path.join(this.root, name));

            this.fs.stat(dir)
                .then((stat)=> cb(null, new Container(this,
                    SFTPProvider.populateMetadata(stat, { name: name }))))
                .catch((err) => cb(err));
        } catch (err) {
            cb(err);
        }
    };

    /**
     *
     * @param container
     * @param options
     * @param cb
     */
    getFiles(container, options, cb=SFTPProvider.defaultErrorCallback) {
        if (typeof options === 'function' && !util.types.isRegExp(options)) {
            cb = options;
        }

        try {
            SFTPProvider.validateName(container);

            let remoteFiles;
            const dir = SFTPProvider.normalizePath(path.join(this.root, container));

            this.fs.readdir(dir)
                .then((files) => {
                    remoteFiles = files;

                    return Promise.all(files.map((file) =>
                        this.fs.stat(SFTPProvider.normalizePath(path.join(dir, file)))))
                })
                .then((fileStats) => {
                    const files = [];

                    for (let fileStat of fileStats) {
                        if (fileStat.isFile()) {
                            files.push(new File(this,
                                SFTPProvider.populateMetadata(fileStat,
                                    { container: container, name: remoteFiles[fileStats.indexOf(fileStat)] })));
                        }
                    }

                    cb(null, files);
                })
                .catch((err) => cb(err));
        } catch (err) {
            cb(err);
        }
    };

    /**
     *
     * @param container
     * @param file
     * @param cb
     */
    getFile(container, file, cb=SFTPProvider.defaultErrorCallback) {
        try {
            SFTPProvider.validateName(container);
            SFTPProvider.validateName(file);

            this.fs.stat(SFTPProvider.normalizePath(path.join(this.root, container, file)))
                .then((stat) => cb(null,
                    new File(this, SFTPProvider.populateMetadata(stat,{container: container, name: file}))))
                .catch((err) => cb(err));
        } catch(err) {
            cb(err);
        }
    };

    /**
     *
     * @param container
     * @param file
     * @param cb
     */
    removeFile(container, file, cb) {
        try {
            SFTPProvider.validateName(container);
            SFTPProvider.validateName(file);

            this.fs.unlink(SFTPProvider.normalizePath(path.join(this.root, container, file)))
                .then(() => cb(null))
                .catch((err) => cb(err));
        } catch(err) {
            cb(err);
        }
    };

    /**
     *
     * @param options
     * @param cb
     * @returns {*}
     */
    upload(options, cb=SFTPProvider.defaultErrorCallback) {
        try {
            SFTPProvider.validateName(options.container);
        } catch(err) {
            return this.writeStreamError(
                new Error(g.f('{{SFTPProvider}}: Invalid name: %s', options.container)),
                cb
            );
        }

        try {
            SFTPProvider.validateName(options.remote);
        } catch(err) {
            return this.writeStreamError(
                new Error(g.f('{{SFTPProvider}}: Invalid name: %s', options.remote)),
                cb
            );
        }

        try {
            return this.fs.createWriteStream(
                SFTPProvider.normalizePath(path.join(this.root, options.container, options.remote)),{
                    flags: options.flags || 'w+',
                    encoding: options.encoding || null,
                    mode: options.mode || parseInt('0666', 8),
                });
        } catch (err) {
            return this.writeStreamError(err, cb);
        }
    };

    /**
     *
     * @param options
     * @param cb
     * @returns {*}
     */
    download(options, cb=SFTPProvider.defaultErrorCallback) {
        try {
            SFTPProvider.validateName(options.container);
        } catch(err) {
            return this.readStreamError(
                new Error(g.f('{{SFTPProvider}}: Invalid name: %s', options.container)),
                cb
            );
        }

        try {
            SFTPProvider.validateName(options.remote);
        } catch(err) {
            return this.readStreamError(
                new Error(g.f('{{SFTPProvider}}: Invalid name: %s', options.remote)),
                cb
            );
        }

        try {
            const fileOpts = { flags: 'r', autoClose: true };

            if (options.start) {
                fileOpts.start = options.start;
                fileOpts.end = options.end;
            }

            return this.fs.createReadStream(
                SFTPProvider.normalizePath(path.join(this.root, options.container, options.remote)), fileOpts);
        } catch (err) {
            return this.readStreamError(err, cb);
        }
    };

    /**
     *
     * @param options
     * @returns {*}
     */
    getUrl(options={}) {
        return SFTPProvider.normalizePath(path.join(this.root, options.container, options.path));
    };

}


module.exports.storage = module.exports;
module.exports.File = File;
module.exports.Container = Container;
module.exports.Client = SFTPProvider;
module.exports.createClient = SFTPProvider.createClient;