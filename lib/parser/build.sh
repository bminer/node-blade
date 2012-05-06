#!/bin/bash
cd $(dirname $0)
pegjs --track-line-and-column blade-grammer.pegjs index.js
