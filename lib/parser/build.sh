#!/bin/bash
cd $(dirname $0)
pegjs --track-line-and-column blade-grammar.pegjs index.js
