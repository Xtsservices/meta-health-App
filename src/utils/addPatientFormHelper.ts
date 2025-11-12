export type Category = "1" | "2" | "3";

export const genderList = [
    { value: "Male", key: 1 },
    { value: "Female", key: 2 },
    { value: "Others", key: 3 }
];

export const getValidationMessage = (
    inputValue: number, 
    category: string, 
    type: "weight" | "height"
): string | undefined => {
    if (type === "weight") {
      if (category === "3" && inputValue > 300) return "Weight should be under 300 kgs";
      if (category === "2" && inputValue > 175) return "Weight should be under 175 kgs";
      if (category === "1" && inputValue > 8) return "Weight should be under 8 kgs";
    } else if (type === "height") {
      if (category === "3" && inputValue > 305) return "Height should be under 305 cms";
      if (category === "2" && inputValue > 200) return "Height should be under 200 cms";
      if (category === "1" && inputValue > 60) return "Height should be under 60 cms";
    }
    return undefined;
};

export const getMaxValue = (
    category: Category,
    type: "weight" | "height"
): number => {
    const values = {
      "3": { weight: 300, height: 305 },
      "2": { weight: 175, height: 200 },
      "1": { weight: 8, height: 60 }
    };
    return values[category]?.[type];
};

export const getUniqueId = () => {
    const now = new Date();
    const value = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2,"0")}${String(now.getDate()).padStart(2, "0")}${String(
    now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
    return value;
}