#!/bin/bash
cd $(dirname $0)
uglifyjs blade-runtime.js > blade-runtime.min.js
