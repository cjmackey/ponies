#!/bin/sh

#
# for home use:
# ./restart.sh -d -l -hlocalhost -p8000 -c8000 -m27017
#
#

BASEDIR=$(dirname $0)
cd $BASEDIR
mkdir -p useruploads
mkdir -p output
mkdir -p outputnew
kill `cat _server.pid` 2>/dev/null
rm _server.pid 2>/dev/null
touch _server.pid 2>/dev/null

html=outputnew/index.html
d=`date '+%s'`.`date '+%N' | cut -b -3`
templates="clienttemplate redirtemplate"
clientjs="util templ                      jobcommon jobclient econcommon econclient usercommon userclient deckcommon deckclient fightcommon fightclient questcommon questclient rpcclient client"
serverjs="util configserver includeserver jobcommon jobserver econcommon econserver usercommon userserver deckcommon            fightcommon             questcommon questserver rpcserver server"
debug=0
lint=0
port=59530
clientport=80
mongoport=22053
host=cjmackey.webfactional.com

while getopts dlh:p:c:m: o
do
    case "$o" in
	d) debug=1 ;;
	l) lint=1 ;;
	h) host="$OPTARG";;
	p) port="$OPTARG";;
	c) clientport="$OPTARG";;
	m) mongoport="$OPTARG";;
    esac
done

cdn="http://$host:80/";





#hash and copy images to output/
#images can be looked up in imagedir
echo 'var imagedir = {' > imagedir.js
mkdir -p outputnew/images
find images -type f -iregex '*jpg'
for f in `find images -type f`
do
    ext=`echo $f | awk -F . '{print $NF}'`
    if echo "$ext" | grep '\.svn' > /dev/null; then
        echo "skipping svn"
        continue
    fi
    if [ "$ext" != "jpeg" ] && [ "$ext" != "jpg" ] && [ "$ext" != "gif" ] && [ "$ext" != "png" ] && [ "$ext" != "ico" ]; then 
        continue
    fi
    checksum=`md5sum $f | cut -b-32`
    f1=$checksum.$ext
    cp $f outputnew/images/$f1
    name=`echo $f | cut -b 8-`
    echo "'${name}':'images/${f1}'," >> imagedir.js
    name=`basename ${name} .${ext}`
    echo "'${name}':'images/${f1}'," >> imagedir.js
done
echo "'':''};" >> imagedir.js

#convert templates
for f in $templates
do
    cat $f.html | sed "s/\\\\/\\\\\\\\/g" | sed "s/'/\\\\'/g" | sed ':a;N;$!ba;s/\n/\\n/g' | sed "s/^\(.*\)$/var template_${f} = '\\1';/" > $f.js
    echo "function ${f}_init(){}" >> $f.js
done

#running jslint
if [ $lint -eq 1 ]
then
    echo "running jslint"
    for f in $clientjs $serverjs
    do
        if [ -f $f.js ]
        then
            checksum=`md5sum $f.js|cut -b-32`
            if grep -q "$checksum" _jslintpassed 2>/dev/null >/dev/null
            then
                echo found $checksum >> /dev/null
            else
                node fulljslint.js $f.js > _jslinttmp
                if grep -q -x "jslint: No problems found.*" _jslinttmp
                then
                    echo $checksum >> _jslintpassed
                else
                    cat _jslinttmp
                fi
                rm _jslinttmp
            fi
        fi
    done
fi



# begin generating javascript files
rm _client.js 2>/dev/null
rm _server.js 2>/dev/null
rm _toinit.js 2>/dev/null

if [ $debug -eq 1 ]
then
		echo "\"use strict\";" > _client.js
		echo "\"use strict\";" > _server.js
fi

# client javascript

echo "" >> _client.js
echo "//cdn: url segment for where to get files" >> _client.js
echo "var cdn = '$cdn';" >> _client.js
echo "var port = $clientport;" >> _client.js

for f in $clientjs
do
    if [ -f $f.js ]
    then
	echo "${f}_init();" >> _toinit.js
	echo "" >> _client.js
	echo "//////// $f.js" >> _client.js
	echo "" >> _client.js
	cat $f.js >> _client.js
    fi
done

echo "//////// document ready stuff" >> _client.js
echo "\$(document).ready(function(){" >> _client.js
cat _toinit.js >> _client.js
echo '});' >> _client.js
rm _toinit.js 2>/dev/null

#server javascript

echo "" >> _server.js

if [ $debug -eq 1 ]
then
    echo "var shouldrestart = false;" >> _server.js
else
    echo "var shouldrestart = true;" >> _server.js
fi
echo "var port = $port;" >> _server.js
echo "var mongoport = $mongoport;" >> _server.js
echo "var mongoauth = 1;" >> _server.js

for f in imagedir $serverjs
do
    if [ -f $f.js ]
    then
	echo "" >> _server.js
	echo "//////// $f.js" >> _server.js
	echo "" >> _server.js
	cat $f.js >> _server.js
    fi
done



# starting to make index.html
echo "<!DOCTYPE html>" > $html
echo "<html><head>" >> $html
echo "<title>Luna Rising</title>" >> $html

checksum=`md5sum style.css | cut -b-32`
f1=style.$checksum.css
cp style.css outputnew/$f1
gzip -c outputnew/$f1 > outputnew/$f1.gz

echo "<link rel=\"stylesheet\" href=\"$f1\" />" >> $html
# in the future: <meta name="HandheldFriendly" content="True" />
#echo '<meta name="viewport" content="target-densitydpi=device-dpi, width=device-width, height=device-height, initial-scale=1.0" />' >> $html
echo "</head><body>" >> $html

#hash javascript files and copy them to output/
for f in ${templates} imagedir jquery-1.6.2.min jquery.form.min json _client
do
    checksum=`md5sum $f.js | cut -b-32`
    f1=$f.$checksum.js
    cp $f.js outputnew/$f1
    gzip -c outputnew/$f1 > outputnew/$f1.gz
    echo "<script src=\"$f1\"></script>" >> $html
done

#clean up things that were copied over and aren't going to be reused
for f in ${templates} imagedir _client
do
    rm $f.js
done

echo "<div id=\"wrap\"></div>" >> $html
echo "</body></html>" >> $html

gzip -c $html > $html.gz

rm -rf outputold 2>/dev/null
mv output outputold
mv outputnew output

if [ $debug -eq 1 ]
then
    node _server.js
else
    node _server.js >>_server.log 2>>_server.err &
fi








