#!/bin/bash

echo "Nothing will stand in our way"
touch __hon__anything__.txt
cat __hon__anything__.txt >> __hon__file.log
rm __hon__file.log __hon__anything__.txt
cd /tmp
echo $1
exit 0