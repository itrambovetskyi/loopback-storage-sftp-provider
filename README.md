SFTP provider for loopback-component-storage (Loopback 3 framework)

## Configuration

loopback-component-storage config example:

    sftp: {
        name: `sftp`,
        connector: `loopback-component-storage`,
        provider: `loopback-storage-sftp-provider`,
        root: `/some-remote-folder/`,
        host: `127.0.0.1`,
        port: `22`,
        username: `user`,
        password: `password`
    }