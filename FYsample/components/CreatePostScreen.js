import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
  Dimensions,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import MapView, { Marker } from "react-native-maps";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system";
import { usePost } from "../context/PostContext";

// Predefined categories
const CATEGORIES = [
  "Water",
  "Roads",
  "Landslides",
  "Electricity",
  "Sanitation",
  "Others",
  
];

// Add the CAMPUS_POLYGON constant at the top of the file
const CAMPUS_POLYGON = [
  // full campus

  [19.022028, 72.869722], // Northwest
  [19.021528, 72.872333], // Northeast
  [19.0211667, 72.8722222], // Between Northeast and Southeast
  [19.020861, 72.871222], // Southeast
  [19.0205556, 72.8705556], // Between Southeast and Southwest
  [19.020833, 72.869556], // Southwest
  [19.022028, 72.869722], // Back to Northwest to close the polygon

  //without

  // [19.022028, 72.869722], // Northwest
  // [19.02192869258965, 72.8703400686917], // Northeast
  // [19.021325596155776, 72.8703766856377], // Between Northeast and Southeast
  // [19.020861, 72.871222], // Southeast
  // [19.0205556, 72.8705556], // Between Southeast and Southwest
  // [19.020833, 72.869556], // Southwest
  // [19.022028, 72.869722], // Back to Northwest to close the polygon
];

// Add this function to check if a point is inside the polygon
const isPointInPolygon = (point, polygon) => {
  const x = point.latitude;
  const y = point.longitude;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
};

const CreatePostScreen = ({ navigation }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [tags, setTags] = useState("");
  const [location, setLocation] = useState(null);
  const [category, setCategory] = useState(CATEGORIES[0]); // Default to first category
  const { createPost } = usePost();

  const [mapRegion, setMapRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  useEffect(() => {
    (async () => {
      // Request permissions for media library
      if (Platform.OS !== "web") {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          alert("Sorry, we need camera roll permissions to make this work!");
        }
      }
    })();
  }, []);

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        alert("Sorry, we need camera roll permissions to make this work!");
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        base64: true,
        quality: 0.5,
      });

      if (!result.canceled) {
        let base64Image;
        if (result.assets[0].base64) {
          base64Image = result.assets[0].base64;
        } else {
          const fileUri = result.assets[0].uri;
          const base64 = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          base64Image = base64;
        }
        setImage(`data:image/jpeg;base64,${base64Image}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error picking image");
    }
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        alert("Permission to access location was denied");
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const userPoint = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude
      };

      // Check if the location is within the college polygon
      if (!isPointInPolygon(userPoint, CAMPUS_POLYGON)) {
        alert("You are currently outside the college premises. Please be within the college area to create a report.");
        return;
      }

      // Get address for the location
      const [address] = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      // Format address more comprehensively
      const addressStr = address ? [
        address.name,
        address.street,
        address.district,
        address.city,
        address.region,
        address.postalCode,
        address.country
      ].filter(Boolean).join(", ") : "Address not available";

      // Set location with coordinates and address
      const locationData = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        address: addressStr
      };

      setLocation(locationData);
      setMapRegion({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.001,
        longitudeDelta: 0.001,
      });

    } catch (error) {
      console.error("Error getting location:", error);
      alert("Failed to get location. Please try again.");
    }
  };

  const handleSubmit = async () => {
    if (!location) {
      alert("Please add your location first");
      return;
    }

    // Check if user is inside the college polygon
    const userPoint = {
      latitude: location.latitude,
      longitude: location.longitude
    };

    if (!isPointInPolygon(userPoint, CAMPUS_POLYGON)) {
      alert("You must be within the college premises to submit a report");
      return;
    }

    if (!title || !description) {
      alert("Please fill in all required fields");
      return;
    }

    const postData = {
      title,
      description,
      image,
      location,
      category,
      tags: tags.split(",").map((tag) => tag.trim()),
    };

    try {
      console.log("Submitting post with data:", postData);
      const result = await createPost(postData);
      console.log("Create post result:", result);

      if (result.success) {
        alert("Post created successfully!");
        navigation.navigate("Profile");
      } else {
        alert(result.message || "Failed to create post");
      }
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create post. Please try again.");
    }
  };

return (
  <View style={styles.container}>
    {/* Fixed Header */}
    <View style={styles.headerContainer}>
      <Text style={styles.header}>Create New Report</Text>
    </View>

    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={true}
    >
      {/* Add paddingTop to avoid content overlapping with header */}
      <View style={{ paddingTop: 60 }}>
        <TextInput
          style={styles.input}
          placeholder="Title"
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        {/* Category Picker */}
        <View style={styles.pickerContainer}>
          <Text style={styles.label}>Category:</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={category}
              onValueChange={(itemValue) => setCategory(itemValue)}
              style={styles.picker}
              dropdownIconColor="#333"
            >
              {CATEGORIES.map((cat) => (
                <Picker.Item key={cat} label={cat} value={cat} />
              ))}
            </Picker>
          </View>
        </View>

        <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
          <Text style={styles.buttonText}>Pick an image</Text>
        </TouchableOpacity>
        {image && <Image source={{ uri: image }} style={styles.preview} />}

        <TouchableOpacity style={styles.locationButton} onPress={getLocation}>
          <Text style={styles.buttonText}>Get Current Location</Text>
        </TouchableOpacity>

        {location && (
          <View style={styles.locationContainer}>
            <Text style={styles.locationText}>
              📍 {location.address}
            </Text>
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                region={mapRegion}
              >
                <Marker
                  coordinate={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                  }}
                  title="Report Location"
                  description={location.address}
                />
              </MapView>
            </View>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="Tags (comma-separated)"
          value={tags}
          onChangeText={setTags}
        />

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Submit Report</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  </View>
);
};

const styles = StyleSheet.create({
  headerContainer: {
    position: "absolute",
    top: 0,
    width: "100%",
    backgroundColor: "#E5E9F2",
    paddingVertical: 20,
    paddingHorizontal: 20,
    zIndex: 1000,

  },

  scrollView: {
    marginTop: 30, 
  },
  container: {
    flex: 1,
    backgroundColor: "#E5E9F2",
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100, // Add extra padding at bottom for bottom tabs
  },
  header: {
    fontSize: 24,
    fontWeight: "600",
    color: "#235DFF",
    marginBottom: 10,
    marginTop: 28,
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: {
    backgroundColor: "white",
    height: 100,
    textAlignVertical: "top",
  },
  pickerContainer: {
    marginBottom: 15,
    ...Platform.select({
      ios: {
        marginTop: -10, // Adjust this value as needed
      },
      android: {
        marginTop: 0, // Adjust this value as needed
      },
    }),
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: "#333",
    fontWeight: "500",
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
    ...Platform.select({
      ios: {
        paddingHorizontal: 12,
        marginBottom: 10,
      },
      android: {
        paddingHorizontal: 0,
      },
    }),
  },
  picker: {
    ...Platform.select({
      ios: {
        height: 50,
        paddingBottom: 200,
      },
      android: {
        height: 50,
      },
    }),
  },
  pickerItem: {
    fontSize: 16,
    color: "#333",
  },
  imageButton: {
    backgroundColor: "#235DFF",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  locationButton: {
    backgroundColor: "#235DFF",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
  },
  preview: {
    width: "100%",
    height: 200,
    marginBottom: 15,
    borderRadius: 16,
  },
  locationContainer: {
    marginBottom: 15,
  },
  locationText: {
    marginBottom: 15,
    fontSize: 16,
    color: "#666",
  },
  submitButton: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 8,
    marginVertical: 20,
  },
  submitButtonText: {
    color: "white",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
  },
  mapContainer: {
    height: 200,
    marginBottom: 15,
    borderRadius: 16,
    overflow: "hidden",
  },
  map: {
    width: "100%",
    height: "100%",
  },
});

export default CreatePostScreen;