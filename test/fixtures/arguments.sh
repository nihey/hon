#!/bin/bash

echo "print \"$1 - It's over $2, I have the high ground.\"" | python
echo "console.log(\"$2 - You underestimate my power.\");" | node
echo "print \"$1 - Don't try it.\"" | python
echo "[$1 slices $2's legs with a light saber]"
echo "print \"$1 - You were the chosen one.\";print \"$1 - It was said that you would destroy the Sith, not join them.\";print \"$1 - Bring ballance to the force, not leave it in darkness.\"" | python
echo "console.log(\"$2 - I hate you!!!\");" | node
echo "print \"$1 - You were my brother $2, I loved you.\"" | python