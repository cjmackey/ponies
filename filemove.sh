#!/bin/sh

BASEDIR=$(dirname $0)
cd $BASEDIR

f0=$1
checksum=`md5sum $f0|cut -b-32`
ext=$2
f1=useruploads/$checksum.$ext
echo $f1

cp $f0 $f1
rm $f0



