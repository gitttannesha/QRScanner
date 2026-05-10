import AsyncStorage from "@react-native-async-storage/async-storage";

// Save token
export const saveToken = async (token) => {
    await AsyncStorage.setItem("token", token);
};

// Get token
export const getToken = async () => {
    return await AsyncStorage.getItem("token");
};

// Remove token (logout)
export const removeToken = async () => {
    await AsyncStorage.removeItem("token");
};

// Save user data
export const saveUser = async (user) => {
    await AsyncStorage.setItem("userData", JSON.stringify(user));
};

// Get user data
export const getUser = async () => {
    const user = await AsyncStorage.getItem("userData");
    return user ? JSON.parse(user) : null;
};

// Clear everything (logout)
export const clearStorage = async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("userData");
};
