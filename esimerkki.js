const promises = [];

createParser(stream, {
  strict: true,
  trim: false,
  normalize: false,
  preserveMarkup: streamParserAlways,
  simplifyNodes: false,
  useArrays: streamParserAlways
})
.on('error', err => Emitter.emit('error', err))
.on('end', async () => {
  logger.log('debug', `Handled ${promises.length} recordEvents`);
  await Promise.all(promises);
  Emitter.emit('end', promises.length);
})
.on('tag:record', async node => {
    promises.push(async () => {
      const obj = convertToObject()
      const result = await convertRecord(obj);
	    Emitter.emit('record', result);
    });

    async function convertToObject() {
      const str = toXml(node);
      return toObject();

      async function toObject() {
        return new Promise((resolve, reject) => {
          new Parser().parseString(str, (err, obj) => {
            if (err) {
              return reject(err);
            }

            resolve(obj);
          })
        });
      }
});  






