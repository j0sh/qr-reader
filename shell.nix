{ pkgs ? import <nixpkgs> {} }:
let
in
pkgs.mkShell {
  packages = [ pkgs.yarn ];
  nativeBuildInputs = [ pkgs.pkg-config ];
  shellHooks = ''
    export GOPATH=$PWD/../go
  '';
}
