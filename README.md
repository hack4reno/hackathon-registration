Hackathon-Registration
--------

This registration system was created for the Hack4Reno hackathon. This is (and will be for awhile) a little messy. If you notice any bugs or have any suggestions, please submit an issue.

### Up to date Github API ###
The node.js Github API library is in development, but needs the most recent changes for the Organization API, so at the moment, it is suggested to install the most recent API with the following steps:

npm install github

cd node_modules

git clone git://github.com/ajaxorg/node-github.git && cd node-github && git submodule update --init

rm -rf github && mkdir github && cd github && cp -rf ../node-github .


### Config File ###
The app is currently configured to have a JSON configuration file at the path "/config/hackathon-config.json". A sample file is below:


{
        "sessionSecret": "superSecretSessionHash",
        "githubClientId": "XXXXX",
        "githubSecretId": "XXXXX",
        "mongourl": "mongo://localhost/somedb",
        "rootHost": "http://host.com/",
        "organizationName": "github-org-name",
        "overlordSetup": false,
        "overlordUsername": "githubSuperadmin"
        "overlordPassword": "githubPassword"
}


### Overlord Account ###
For now, the Github API requires an account that is an owner of the organization that is housing the Github teams. Because of this, there is an overlord account that needs to be configured. More info to come soon.