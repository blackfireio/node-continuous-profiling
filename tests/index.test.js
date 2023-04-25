const Blackfire = require('@blackfire/nodejs');
const express = require('express');
const fileUpload = require('express-fileupload');

jest.setTimeout(5000);

test('Blackfire imports', () => {
    expect(Blackfire.start).toBeInstanceOf(Function);
    expect(Blackfire.stop).toBeInstanceOf(Function);

    expect(Blackfire.defaultConfig).toHaveProperty('durationMillis');
    expect(Blackfire.defaultConfig).toHaveProperty('intervalMicros');
    expect(Blackfire.defaultConfig).toHaveProperty('agentSocket');
    expect(Object.keys(Blackfire.defaultConfig)).toHaveLength(3);
});

test('Profile is sent', (done) => {
    const app = express();
    app.use(fileUpload());
    const server = app.listen(4242, () => {
        Blackfire.start({
            agentSocket: "http://localhost:4242",
            durationMillis: 100,
        });
    });

    expect.hasAssertions();
    app.post('/profiling/v1/input', (req, res) => {
        Blackfire.stop();

        expect(req.files).toBeDefined();
        expect(Object.keys(req.files)).toHaveLength(1);
        expect(req.files).toHaveProperty('profile');
        expect(req.files.profile.name).toBe('profile.pprof');
        expect(req.files.profile.mimetype).toBe('text/json');
        expect(req.files.profile.size).toBeGreaterThan(0);

        res.sendStatus(200);
        setImmediate(() => {
            server.close();
            done()
        });
    });
});
