# Hon

Multi Level Bash Scripts

[![Dependency
Status](https://david-dm.org/nihey/hon.png)](https://david-dm.org/nihey/hon)

# Why?

Bash scripts are widely used to collapse multi-step processes into a single
step, but a lot of times they can get not-so-readable:

```bash
npm run build
zip dist.zip dist/ -r
scp dist.zip chimera:/tmp
ssh chimera "cd /tmp; unzip dist.zip; cp dist/* /var/www/nihey.org/; rm dist.zip dist/ -r;"
rm dist.zip
```

Hon solves that by allowing you to code multi level scripts:

```bash
npm run build
zip dist.zip dist/ -r
scp dist.zip chimera:/tmp
ssh chimera
    cd /tmp
    unzip dist.zip
    cp dist/* /var/www/nihey.org/
    rm dist.zip dist/ -r
rm dist.zip
```

It makes it easier to code in other languages inside a bash script too:

```bash
ssh chimera
    python
        print 'It really works'
    node
        console.log("I can even read arguments: $1")
python
    print 'Awesome!'
```

# Installation
```bash
$ npm i -g hon
```

# Usage

```
  Multi Level Bash Scripts

  Usage
    hon [options] <file> [...args]

  Options:
    -b, --bash      just show the equivalent bash script
    -q, --quiet     do not show stdout and stderr
```

You just need to create your script:

```bash
# script.hon

ssh nitrogen
    cd /var/www/nihey.org
    git fetch
    git rebase
    sed -itmp -e "s/FOO/BAR/g" config.file
    sudo supervisorctl restart
```

Then just run the script:

```bash
$ hon script.hon
```

# License

This code is released under
[CC0](http://creativecommons.org/publicdomain/zero/1.0/) (Public Domain)
