FROM node:alpine
CMD ["/usr/local/bin/node", "index.js"]
WORKDIR /home/node

ENV PERL5LIB="${HOME}/perl5/lib/perl5:${PATH}"
ENV CONVERSION_SCRIPT_PATH="${HOME}/melinda-elisa-ellibs-eresource-scripts/elisa_metadata_konversio.pl"

COPY --chown=node:node . build
COPY --chown=node:node melinda-elisa-ellibs-eresource-scripts .

RUN apk add -U --no-cache --virtual .build-deps git build-base sudo wget perl-dev expat-dev \
  && apk add --no-cache perl \
  && sudo -u node wget https://cpanmin.us/ -O  cpanm \
  && sudo -u node chmod +x cpanm \
  && sudo -u node ./cpanm -n XML::Hash Path::Tiny Data::Dumper::Names \
    Scalar::Util Lingua::Identify Text::Ngram MARC::File Encode \
  && sudo -u node rm cpanm && rm -rf ~/.cpanm \
  && sudo -u node wget \
    https://raw.githubusercontent.com/NatLibFi/MARC-File-MARCXML/master/lib/MARC/File/MARCXML.pm \
    -O perl5/lib/perl5/MARC/File/MARCXML.pm \
  && sudo -u node rm -rf build/node_modules \
  && sudo -u node sh -c 'cd build && npm install && npm run build' \
  && sudo -u node cp -r build/package.json build/dist/* . \
  && sudo -u node npm install --prod \
  && sudo -u node npm cache clean -f \
  && apk del .build-deps \
  && rm -rf build tmp/* /var/cache/apk/*

USER node
