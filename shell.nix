with (import <nixpkgs> {});
mkShell {
  buildInputs = [
    nodejs-14_x
    adoptopenjdk-hotspot-bin-11
    awscli2
    flyway
  ];
  shellHook = ''
      mkdir -p ./.nix-node
      export NODE_PATH=$PWD/.nix-node
      npm config set prefix=./.nix-node
      export PATH=$NODE_PATH/bin:$PATH
      npm install npm -g 
      npm install typescript aws-cdk@1.114.0 -g
  '';
}