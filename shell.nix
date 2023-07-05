with (import <nixpkgs> {});
mkShell {
  buildInputs = [
    nodejs-18_x
    temurin-bin-17
    certstrap
    openssl
    awscli2
    flyway
  ];
  shellHook = ''
      mkdir -p ~/.nix-node
      export NODE_PATH=~/.nix-node
      npm config set prefix=~/.nix-node
      export PATH=$NODE_PATH/bin:$PATH
      export CDK_DEFAULT_ACCOUNT=226350727888
      export CDK_DEFAULT_REGION=us-east-1
      npm install npm -g 
  '';
}