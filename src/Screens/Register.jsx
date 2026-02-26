import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";

export default function RegisterScreen() {
  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [rollno, setRollno] = useState("");
  const [course, setCourse] = useState("");
  const [department, setDepartment] = useState("");
  const [researchArea, setResearchArea] = useState("");

  const handleRegister = () => {
    if (
      !fname ||
      !lname ||
      !email ||
      !password ||
      !mobile ||
      !rollno ||
      !course ||
      !department ||
      !researchArea
    ) {
      Alert.alert("Please fill all fields");
      return;
    }

    Alert.alert("Registered Successfully ✅");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.box}>
        <Text style={styles.title}>Register</Text>

        <TextInput
          placeholder="First Name"
          style={styles.input}
          onChangeText={setFname}
        />

        <TextInput
          placeholder="Last Name"
          style={styles.input}
          onChangeText={setLname}
        />

        <TextInput
          placeholder="Email"
          style={styles.input}
          onChangeText={setEmail}
        />

        <TextInput
          placeholder="Password"
          secureTextEntry
          style={styles.input}
          onChangeText={setPassword}
        />

        <TextInput
          placeholder="Mobile"
          style={styles.input}
          onChangeText={setMobile}
        />

        <TextInput
          placeholder="Roll No"
          style={styles.input}
          onChangeText={setRollno}
        />

        <TextInput
          placeholder="Course"
          style={styles.input}
          onChangeText={setCourse}
        />

        <TextInput
          placeholder="Department"
          style={styles.input}
          onChangeText={setDepartment}
        />

        <TextInput
          placeholder="Research Area"
          style={styles.input}
          onChangeText={setResearchArea}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleRegister}
        >
          <Text style={styles.buttonText}>
            Register
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
    padding: 20,
  },

  box: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    elevation: 5,
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },

  button: {
    backgroundColor: "#28a745",
    padding: 12,
    borderRadius: 5,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
