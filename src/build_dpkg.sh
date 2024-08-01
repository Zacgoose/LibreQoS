#!/bin/bash

####################################################
# Copyright (c) 2022, Herbert Wolverson and LibreQoE
# This is all GPL2.

BUILD_DATE=`date +%Y%m%d%H%M`
if [ $1 = "--nostamp" ]
then
    BUILD_DATE=""
fi
PACKAGE=libreqos
VERSION=`cat ./VERSION_STRING`.$BUILD_DATE
PKGVERSION=$PACKAGE
PKGVERSION+="_"
PKGVERSION+=$VERSION
DPKG_DIR=dist/$PKGVERSION-1_amd64
APT_DEPENDENCIES="python3-pip, nano, graphviz, curl"
DEBIAN_DIR=$DPKG_DIR/DEBIAN
LQOS_DIR=$DPKG_DIR/opt/libreqos/src
ETC_DIR=$DPKG_DIR/etc
MOTD_DIR=$DPKG_DIR/etc/update-motd.d
LQOS_FILES="graphInfluxDB.py influxDBdashboardTemplate.json integrationCommon.py integrationPowercode.py integrationRestHttp.py integrationSonar.py integrationSplynx.py integrationUISP.py integrationSonar.py LibreQoS.py lqos.example lqTools.py mikrotikFindIPv6.py network.example.json pythonCheck.py README.md scheduler.py ShapedDevices.example.csv lqos.example ../requirements.txt"
LQOS_BIN_FILES="lqos_scheduler.service.example lqosd.service.example"
RUSTPROGS="lqosd lqtop xdp_iphash_to_cpu_cmdline xdp_pping lqusers lqos_setup lqos_map_perf uisp_integration lqos_support_tool"

####################################################
# Clean any previous dist build
rm -rf dist

####################################################
# Bump the build number

####################################################
# The Debian Packaging Bit

# Create the basic directory structure
mkdir -p $DEBIAN_DIR

# Build the chroot directory structure
mkdir -p $LQOS_DIR
mkdir -p $LQOS_DIR/bin/static2
mkdir -p $ETC_DIR
mkdir -p $MOTD_DIR

# Create the Debian control file
pushd $DEBIAN_DIR > /dev/null || exit
touch control
echo "Package: $PACKAGE" >> control
echo "Version: $VERSION" >> control
echo "Architecture: amd64" >> control
echo "Maintainer: Herbert Wolverson <herberticus@gmail.com>" >> control
echo "Description: CAKE-based traffic shaping for ISPs" >> control
echo "Depends: $APT_DEPENDENCIES" >> control
popd > /dev/null || exit

# Create the post-installation file
pushd $DEBIAN_DIR > /dev/null || exit
touch postinst
echo "#!/bin/bash" >> postinst
echo "# Install Python Dependencies" >> postinst
echo "pushd /opt/libreqos" >> postinst
# - Setup Python dependencies as a post-install task
echo "python3 -m pip install --break-system-packages -r src/requirements.txt" >> postinst
echo "sudo python3 -m pip install --break-system-packages -r src/requirements.txt" >> postinst
# - Run lqsetup
echo "/opt/libreqos/src/bin/lqos_setup" >> postinst
# - Setup the services
echo "cp /opt/libreqos/src/bin/lqosd.service.example /etc/systemd/system/lqosd.service" >> postinst
echo "cp /opt/libreqos/src/bin/lqos_scheduler.service.example /etc/systemd/system/lqos_scheduler.service" >> postinst
echo "/bin/systemctl daemon-reload" >> postinst
echo "/bin/systemctl stop lqos_node_manager" >> postinst # In case it's running from a previous release
echo "/bin/systemctl disable lqos_node_manager" >> postinst # In case it's running from a previous release
echo "/bin/systemctl enable lqosd lqos_scheduler" >> postinst
echo "/bin/systemctl start lqosd" >> postinst
echo "/bin/systemctl start lqos_scheduler" >> postinst
echo "popd" >> postinst
# Attempting to fixup versioning issues with libpython.
# This requires that you already have LibreQoS installed.
LINKED_PYTHON=$(ldd /opt/libreqos/src/bin/lqosd | grep libpython | sed -e '/^[^\t]/ d' | sed -e 's/\t//' | sed -e 's/.*=..//' | sed -e 's/ (0.*)//')
echo "if ! test -f $LINKED_PYTHON; then" >> postinst
echo "  if test -f /lib/x86_64-linux-gnu/libpython3.12.so.1.0; then" >> postinst
echo "    ln -s /lib/x86_64-linux-gnu/libpython3.12.so.1.0 $LINKED_PYTHON" >> postinst
echo "  fi" >> postinst
echo "  if test -f /lib/x86_64-linux-gnu/libpython3.11.so.1.0; then" >> postinst
echo "    ln -s /lib/x86_64-linux-gnu/libpython3.11.so.1.0 $LINKED_PYTHON" >> postinst
echo "  fi" >> postinst
echo "fi" >> postinst
# End of symlink insanity
chmod a+x postinst

# Uninstall Script
touch postrm
echo "#!/bin/bash" >> postrm
echo "/bin/systemctl stop lqosd" >> postrm
echo "/bin/systemctl stop lqos_scheduler" >> postrm
echo "/bin/systemctl disable lqosd lqos_scheduler" >> postrm
chmod a+x postrm
popd > /dev/null || exit

# Create the cleanup file
pushd $DEBIAN_DIR > /dev/null || exit
touch postrm
echo "#!/bin/bash" >> postrm
chmod a+x postrm
popd > /dev/null || exit

# Copy files into the LibreQoS directory
for file in $LQOS_FILES
do
    cp $file $LQOS_DIR
done

# Copy files into the LibreQoS/bin directory
for file in $LQOS_BIN_FILES
do
    cp bin/$file $LQOS_DIR/bin
done

####################################################
# Build the Rust programs
pushd rust > /dev/null || exit
cargo clean
cargo build --all --release
popd > /dev/null || exit

# Copy newly built Rust files
# - The Python integration Library
cp rust/target/release/liblqos_python.so $LQOS_DIR
# - The main executables
for prog in $RUSTPROGS
do
    cp rust/target/release/$prog $LQOS_DIR/bin
done

# Compile the website
pushd rust/lqosd > /dev/null || exit
./copy_files.sh
popd || exit
cp -r bin/static2/* $LQOS_DIR/bin/static2

####################################################
# Add Message of the Day
pushd $MOTD_DIR > /dev/null || exit
echo "#!/bin/bash" > 99-libreqos
echo "MY_IP=\'hostname -I | cut -d' ' -f1\'" >> 99-libreqos
echo "echo \"\"" >> 99-libreqos
echo "echo \"LibreQoS Traffic Shaper is installed on this machine.\"" >> 99-libreqos
echo "echo \"Point a browser at http://\$MY_IP:9123/ to manage it.\"" >> 99-libreqos
echo "echo \"\"" >> 99-libreqos
chmod a+x 99-libreqos
popd || exit

####################################################
# Assemble the package
dpkg-deb --root-owner-group --build $DPKG_DIR
