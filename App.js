/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import {
  Platform,
  ScrollView,
  Switch,
  Text,
  SafeAreaView,
  View,
  ActivityIndicator,
  Modal
} from 'react-native';

import {
  Header,
  LearnMoreLinks,
  Colors,
  DebugInstructions,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';

import BluetoothSerial, {
  withSubscription
} from "react-native-bluetooth-serial-next";

import Button from "./components/Button";
import DeviceList from "./components/DeviceList";

import styles from "./styles";

const util = require('util');

class App extends React.Component {

  constructor(props) {
    super(props);
    this.events = null;
    this.state = {
      isEnabled: false,
      device: null,
      devices: [],
      scanning: false,
      processing: false,
      msg:"Sin mensaje",
      http: false
    };
  }

  async componentDidMount() {
    this.events = this.props.events;
    try {
      const [isEnabled, devices] = await Promise.all([
        BluetoothSerial.isEnabled(),
        BluetoothSerial.list()
      ]);

      this.setState({
        isEnabled,
        devices: devices.map(device => ({
          ...device,
          paired: true,
          connected: false
        }))
      });

      console.log(devices);

    } catch (e) {
      console.log("sale mensaje: ");
      console.log(e.messaage);
    }

    this.events.on("bluetoothEnabled", () => {
      console.log("BT encendido!!")
      this.setState({ isEnabled: true });
    });

    this.events.on("bluetoothDisabled", () => {
      console.log("BT apagado!!")
      this.setState({ isEnabled: false });
    });

    this.events.on("data", result => {
      if (result) {
        const { id, data } = result;
        console.log(`Data from device ${id} : ${data}`);
        console.log("sucedio el evento data")
      }
    });

    this.events.on("read", result => {
      if (result) {
        const { id, data } = result;
        console.log(`Data from device ${id} : ${data}`);
        console.log("sucedio el evento leer")
      }
    });

    this.events.on("error", e => {
      if (e) {
        console.log(`Error: ${e.message}`);
      }
    });
  
  }

  write = async (id, message) => {
    try {
      await BluetoothSerial.device(id).write(message);
      
    } catch (e) {
      
    }
  };

  read = async (id) => {

  

    try {
      await BluetoothSerial.device(id).readEvery((data, intervalId) => {

        var device_ = this.state.device;
        if(device_){

          if(String(data) != ""){
            this.setState({
              msg: data
            })
            console.log("Seescribio con BT: ");
            console.log(this.state.msg);
          }

        }

        if (this.imBoredNow && intervalId) {
          clearInterval(intervalId);
        }
      },
      50,
      "#" );
      
    } catch (e) {
      
    }
  };

  requestEnable = () => async () => {
    try {
      await BluetoothSerial.requestEnable();
      this.setState({ isEnabled: true });
    } catch (e) {
     console.log(e.message);
    }
  };


  toggleBluetooth = async value => {
    try {
      if (value) {
        await BluetoothSerial.enable();
        this.listDevices();

      } else {
        await BluetoothSerial.disable();
      }

    } catch (e) {
      console.log("Hay un erro al encender");
    }
  };


  listDevices = async () => {
    try {
      const list = await BluetoothSerial.list();


      const [isEnabled, devices] = await Promise.all([
        BluetoothSerial.isEnabled(),
        BluetoothSerial.list()
      ]);

      this.setState({
        isEnabled,
        devices: devices.map(device => ({
          ...device,
          paired: true,
          connected: false
        }))
      });

    } catch (e) {
     
    }
  };

  discoverUnpairedDevices = async () => {
    this.setState({ scanning: true });

    try {
      const unpairedDevices = await BluetoothSerial.listUnpaired();

      this.setState(({ devices }) => ({
        scanning: false,
        devices: devices
          .map(device => {
            const found = unpairedDevices.find(d => d.id === device.id);

            if (found) {
              return {
                ...device,
                ...found,
                connected: false,
                paired: false
              };
            }

            return device.paired || device.connected ? device : null;
          })
          .map(v => v)
      }));
    } catch (e) {

      this.setState(({ devices }) => ({
        scanning: false,
        devices: devices.filter(device => device.paired || device.connected)
      }));
    }
  };

  cancelDiscovery = () => async () => {
    try {
      await BluetoothSerial.cancelDiscovery();
      this.setState({ scanning: false });
    } catch (e) {

    }
  };

  toggleDevicePairing = async ({ id, paired }) => {
    if (paired) {
      await this.unpairDevice(id);
    } else {
      await this.pairDevice(id);
    }
  };

  pairDevice = async id => {
    this.setState({ processing: true });

    try {
      const paired = await BluetoothSerial.pairDevice(id);

      if (paired) {

        this.setState(({ devices, device }) => ({
          processing: false,
          device: {
            ...device,
            ...paired,
            paired: true
          },
          devices: devices.map(v => {
            if (v.id === paired.id) {
              return {
                ...v,
                ...paired,
                paired: true
              };
            }

            return v;
          })
        }));
      } else {
        this.setState({ processing: false });
      }
    } catch (e) {
      this.setState({ processing: false });
    }
  };

  unpairDevice = async id => {
    this.setState({ processing: true });

    try {
      const unpaired = await BluetoothSerial.unpairDevice(id);

      if (unpaired) {

        this.setState(({ devices, device }) => ({
          processing: false,
          device: {
            ...device,
            ...unpaired,
            connected: false,
            paired: false
          },
          devices: devices.map(v => {
            if (v.id === unpaired.id) {
              return {
                ...v,
                ...unpaired,
                connected: false,
                paired: false
              };
            }

            return v;
          })
        }));
      } else {

        this.setState({ processing: false });
      }
    } catch (e) {
  
      this.setState({ processing: false });
    }
  };

  toggleDeviceConnection = async ({ id, connected }) => {
    if (connected) {
      await this.disconnect(id);
    } else {
      await this.connect(id);
    }
  };

  connect = async id => {
    this.setState({ processing: true });

    try {
      const connected = await BluetoothSerial.device(id).connect();

      if (connected) {

        this.setState(({ devices, device }) => ({
          processing: false,
          device: {
            ...device,
            ...connected,
            connected: true
          },
          devices: devices.map(v => {
            if (v.id === connected.id) {
              return {
                ...v,
                ...connected,
                connected: true
              };
            }

            return v;
          })
        }));
      } else {
        this.setState({ processing: false });
      }
    } catch (e) {
      this.setState({ processing: false });
    }
  };
  
  disconnect = async id => {
    this.setState({ processing: true });

    try {
      await BluetoothSerial.device(id).disconnect();

      this.setState(({ devices, device }) => ({
        processing: false,
        device: {
          ...device,
          connected: false
        },
        devices: devices.map(v => {
          if (v.id === id) {
            return {
              ...v,
              connected: false
            };
          }

          return v;
        })
      }));
    } catch (e) {
    
      this.setState({ processing: false });
    }
  };

  
  ciclo(){

    const that =this;

    function funcpromes(){

      const that2=that;

      fetch("http://192.168.0.19:80")
      .then(res => res.text())
      .then(data => {
        
            that2.setState({
              msg:data
            });
            
            console.log("enviando en http");

            if(that2.state.http){
            setTimeout(funcpromes, 100);
            }

          });
      
     // console.log(that2.state.variTR)
      
    }
    const promes = util.promisify(funcpromes);
    promes()

  }




  renderModal = (device, processing) => {
    if (!device) return null;

    const { id, name, paired, connected } = device;

    return (
      <Modal
        animationType="fade"
        transparent={false}
        visible={true}
        onRequestClose={() => {}}
      >
        {device ? (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center"
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "bold" }}>{name}</Text>
            <Text style={{ fontSize: 14 }}>{`<${id}>`}</Text>

            {processing && (
              <ActivityIndicator
                style={{ marginTop: 15 }}
                size={Platform.OS === "ios" ? 1 : 60}
              />
            )}

            {!processing && (
              <View style={{ marginTop: 20, width: "50%" }}>
                {Platform.OS !== "ios" && (
                  <Button
                    title={paired ? "Desemparejar" : "Emparejar"}
                    style={{
                      backgroundColor: "#22509d"
                    }}
                    textStyle={{ color: "#fff" }}
                    onPress={() => this.toggleDevicePairing(device)}
                  />
                )}

                <Button
                  title={connected ? "Desconectar" : "Conectar"}
                  style={{
                    backgroundColor: "#22509d"
                  }}
                  textStyle={{ color: "#fff" }}
                  onPress={() => this.toggleDeviceConnection(device)}
                />

                {connected && (
                  <React.Fragment>
                    <Button
                      title="Escribir en BT"
                      style={{
                        backgroundColor: "#22509d"
                      }}
                      textStyle={{ color: "#fff" }}
                      onPress={() =>
                        this.write(
                          id,
                          "This is the test message\r\nDoes it work?\r\nTell me it works!\r\n"
                        )
                      }
                    />

                    <Button
                      title="Leer de BT"
                      style={{
                        backgroundColor: "#22509d"
                      }}
                      textStyle={{ color: "#fff" }}
                      onPress={() =>
                        this.read(id)
                      }

                    />
                    <View style={{
                      top: 30,
                      //flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      //backgroundColor: "#74F39E",
                     
                      borderRadius:10,
                      borderWidth:3,
                      borderColor: "#22509d",
                      height: 170,
                      width: "100%"
                    }}>
                      <Text style={{ top: 10, fontSize: 24, fontWeight: "bold"}} >Mensaje recibido</Text>
                      <Text style={{ top: 20, fontSize: 40, fontWeight: "bold", color: "#0A92F6",}} > {this.state.msg} </Text>
                      
                    </View>


                  </React.Fragment>
                )}

                <Button
                  style={{
                    top:150
                  }}
                  title="Atras"
                  onPress={() => this.setState({ device: null })}
                />
              </View>

            )}
          </View>
        ) : null}
      </Modal>
    );
  };



  renderModal2 = () => {

    var http_ = this.state.http;
    if (!http_) return null;

    return (
      <Modal
        animationType="fade"
        transparent={false}
        visible={true}
        onRequestClose={() => {}}
      >
        {http_  ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center"}}>

            <View style={{ marginTop: 20, width: "80%"}}>
                
                  <Button
                    title="Leer servidor"
                    style={{
                      backgroundColor: "#22509d"
                    }}
                    textStyle={{ color: "#fff" }}
                    onPress={() =>
                      this.ciclo()
                    }

                  />      
                  
                  <View style={{
                        top: 30,
                        //flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        //backgroundColor: "#74F39E",
                        
                        borderRadius:10,
                        borderWidth:3,
                        borderColor: "#22509d",
                        height: 170,
                        width: "100%"
                      }}>
                    <Text style={{ top: 10, fontSize: 24, fontWeight: "bold"}} >Mensaje recibido</Text>
                    <Text style={{ top: 20, fontSize: 48, fontWeight: "bold", color: "#0A92F6",}} > {this.state.msg} </Text>
                        
                  </View>

                  <Button
                    style={{
                      top:150
                    }}
                    title="Atras"
                    onPress={() => this.setState({ http: null })}>
                  </Button>

              </View>
          </View>
       ) : null}

      </Modal>
    );
  };



 render() {
    const { isEnabled, device, devices, scanning, processing } = this.state;

    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.topBar}>
          <Text style={styles.heading}>Ejemplo Bluetooth y HTTP Request</Text>

          <View style={styles.enableInfoWrapper}>
            <Text style={{ fontSize: 11, color: "#fff", paddingRight: 10 }}>
              {isEnabled ? "Encendido" : "Apagado"}
            </Text>
            <Switch onValueChange={this.toggleBluetooth} value={isEnabled} />
          </View>

        </View>


        {scanning ? (
          isEnabled && (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <ActivityIndicator
                style={{ marginBottom: 15 }}
                size={Platform.OS === "ios" ? 1 : 60}
              />
              <Button
                textStyle={{ color: "#fff" }}
                style={styles.buttonRaised}
                title="Cancelar busqueda"
                onPress={this.cancelDiscovery}
              />
            </View>
          )
        ) : (
          <React.Fragment>
            {this.renderModal(device, processing)}
            <DeviceList
              devices={devices}
              onDevicePressed={device => this.setState({ device })}
              onRefresh={this.listDevices}
            />

          </React.Fragment>
          
        )}

          <React.Fragment>
            {this.renderModal2()}
            <View 
              style={{
                bottom:250,
                alignItems: "center",
                justifyContent: "center"
              }}>
                <Button
                title="Conectar con servidor HTTP"
                style={{
                  backgroundColor: "#22509d"
                }}
                textStyle={{ color: "#fff" }}
                onPress={() =>
                  this.setState({
                    http: true
                  })
                }
                />
            </View>

          </React.Fragment>

        


        <View style={styles.footer}>
          <ScrollView horizontal contentContainerStyle={styles.fixedFooter}>
            {isEnabled && (
              <Button
                title="Buscar disp. BT"
                onPress={this.discoverUnpairedDevices}
              />
            )}
            {!isEnabled && (
              <Button title="Habilitar permiso de Bluetooth" onPress={this.requestEnable} />
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

};



export default withSubscription({ subscriptionName: "events" })(App);
