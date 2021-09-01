#!/usr/bin/env bash

rollup -c
rm -rf build/types
mkdir -p example/build
cp -h
cp "build/MultipassShaderHelper.cdn.js" "example/build/MultipassShaderHelper.cdn.js"