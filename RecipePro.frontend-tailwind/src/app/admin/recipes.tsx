  import {

    useState,

    useMemo,

    useCallback,

    useEffect,

  } from "react";

  import {

    View,

    Text,

    FlatList,

    Pressable,

    StyleSheet,

    Alert,

    Modal,

    Image,

  } from "react-native";

  import { useRouter, useFocusEffect  } from "expo-router";

  import { SafeAreaView } from "react-native-safe-area-context";

  import { Ionicons } from "@expo/vector-icons";

  import { ApiError } from "../../api/client";

  import { recipeApi } from "../../api/recipeApi";

  import type { RecipeResponse } from "../../types/recipe";

  import SearchBar from "../../components/common/SearchBar";

  import ScreenLoader from "../../components/common/ScreenLoader";

  type FilterTab =

    | "all"

    | "published"

    | "draft";

  export default function AdminRecipesScreen() {

    const router = useRouter();

    const [recipes, setRecipes] =

      useState<RecipeResponse[]>([]);

    const [search, setSearch] =

      useState("");

    const [activeTab, setActiveTab] =

      useState<FilterTab>("all");

    const [loading, setLoading] =

      useState(true);

    const [

      deleteModalVisible,

      setDeleteModalVisible,

    ] = useState(false);

    const [deleteId, setDeleteId] =

      useState<number | null>(null);

    const [deleteName, setDeleteName] =

      useState("");

    const [deleting, setDeleting] =

      useState(false);

    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const [successTitle, setSuccessTitle] = useState("Recipe Deleted!");
    const [successMessage, setSuccessMessage] = useState("");

    const load = useCallback(async () => {

      try {

        setRecipes(

          await recipeApi.getAll()

        );

      } catch (e) {

        console.error(

          "LOAD RECIPES ERROR:",

          e

        );

        if (e instanceof ApiError) {

          Alert.alert(

            `Load Failed (${e.status})`,

            e.message

          );

        } else if (e instanceof Error) {

          Alert.alert(

            "Error",

            e.message

          );

        } else {

          Alert.alert(

            "Error",

            "Unable to load recipes."

          );

        }

      } finally {

        setLoading(false);

      }

    }, []);

    useFocusEffect(
  useCallback(() => {
    void load();
  }, [load])
);

    const filtered = useMemo(() => {

      let result = recipes;

      if (activeTab === "published") {

        result = result.filter(

          (r) => r.status === "Published"

        );

      }

      if (activeTab === "draft") {

        result = result.filter(

          (r) => r.status === "Draft"

        );

      }

      if (search.trim()) {

        result = result.filter((r) =>

          `${r.name} ${r.categoryName}`

            .toLowerCase()

            .includes(

              search.toLowerCase()

            )

        );

      }

      return result;

    }, [

      recipes,

      activeTab,

      search,

    ]);

    const handleDelete = (

      id: number,

      name: string

    ) => {

      setDeleteId(id);

      setDeleteName(name);

      setDeleteModalVisible(true);

    };

    const confirmDelete = async () => {

      if (deleteId === null) {

        return;

      }

      try {

        setDeleting(true);

        await recipeApi.delete(deleteId);

        setDeleteModalVisible(false);

        setDeleteId(null);

        setDeleteName("");

        await load();
        setSuccessTitle("Recipe Deleted!");
        setSuccessMessage(`"${deleteName}" has been deleted successfully.`);
        setSuccessModalVisible(true);

      } catch (error) {

        console.error(

          "DELETE RECIPE ERROR:",

          error

        );

        if (error instanceof ApiError) {

          console.error(

            "DELETE RECIPE STATUS:",

            error.status

          );

          console.error(

            "DELETE RECIPE RESPONSE:",

            error.data

          );

          Alert.alert(

            `Delete Failed (${error.status})`,

            error.message

          );

        } else if (

          error instanceof Error

        ) {

          Alert.alert(

            "Delete Failed",

            error.message

          );

        } else {

          Alert.alert(

            "Delete Failed",

            "Unable to delete recipe."

          );

        }

      } finally {

        setDeleting(false);

      }

    };

    const tabs: {

      key: FilterTab;

      label: string;

    }[] = [

      {

        key: "all",

        label: "All",

      },

      {

        key: "published",

        label: "Published",

      },

      {

        key: "draft",

        label: "Draft",

      },

    ];

    if (loading) {

      return <ScreenLoader />;

    }

    return (

      <SafeAreaView

        style={styles.container}

        edges={["top"]}

      >

        <FlatList

          data={filtered}

          keyExtractor={(item) =>

            String(item.id)

          }

          showsVerticalScrollIndicator={

            false

          }

          contentContainerStyle={

            styles.listContent

          }

          ListHeaderComponent={

            <View style={styles.header}>

              <View

                style={styles.headerTop}

              >

                <Text

                  style={styles.title}

                >

                  Recipes

                </Text>

                <Pressable

                  style={

                    styles.addButton

                  }

                  onPress={() =>

                    router.push(

                      "/admin/edit-recipe/new"

                    )

                  }

                >

                  <Ionicons

                    name="add"

                    size={20}

                    color="#fff"

                  />

                  <Text

                    style={

                      styles.addButtonText

                    }

                  >

                    Add

                  </Text>

                </Pressable>

              </View>

              <View

                style={

                  styles.searchContainer

                }

              >

                <SearchBar

                  value={search}

                  onChangeText={setSearch}

                  placeholder="Search recipes..."

                />

              </View>

              <View

                style={

                  styles.tabContainer

                }

              >

                {tabs.map((tab) => (

                  <Pressable

                    key={tab.key}

                    style={[

                      styles.tab,

                      activeTab ===

                        tab.key &&

                        styles.tabActive,

                    ]}

                    onPress={() =>

                      setActiveTab(

                        tab.key

                      )

                    }

                  >

                    <Text

                      style={[

                        styles.tabText,

                        activeTab ===

                          tab.key &&

                          styles.tabTextActive,

                      ]}

                    >

                      {tab.label}

                    </Text>

                  </Pressable>

                ))}

              </View>

            </View>

          }

          renderItem={({ item }) => (

            <View

              style={styles.recipeCard}

            >

              <Pressable

                style={

                  styles.recipeContent

                }

                onPress={() =>

                  router.push({

                    pathname:

                      "/recipe/[id]",

                    params: {

                      id: String(item.id),

                    },

                  })

                }

              >

                <View

                  style={

                    styles.recipeImage

                  }

                >

                  {item.photoUrl ? (

                    <Image

                      source={{

                        uri: item.photoUrl,

                      }}

                      style={

                        styles.recipeImageActual

                      }

                      resizeMode="cover"

                      onError={(error) =>

                        console.log(

                          "ADMIN RECIPE IMAGE ERROR:",

                          item.name,

                          item.photoUrl,

                          error.nativeEvent

                        )

                      }

                    />

                  ) : (

                    <Text

                      style={

                        styles.recipeEmoji

                      }

                    >

                      {item.name.charAt(

                        0

                      )}

                    </Text>

                  )}

                </View>

                <View

                  style={styles.recipeInfo}

                >

                  <Text

                    style={

                      styles.recipeName

                    }

                    numberOfLines={1}

                  >

                    {item.name}

                  </Text>

                  <Text

                    style={styles.recipeMeta}

                  >

                    {item.categoryName} ·{" "}

                    {item.baseServings} servings

                  </Text>

                  <View

                    style={[

                      styles.statusBadge,

                      item.status ===

                        "Published"

                        ? styles.publishedBadge

                        : styles.draftBadge,

                    ]}

                  >

                    <Text

                      style={[

                        styles.statusText,

                        item.status ===

                          "Published"

                          ? styles.publishedText

                          : styles.draftText,

                      ]}

                    >

                      {item.status}

                    </Text>

                  </View>

                </View>

              </Pressable>

              <View

                style={styles.recipeActions}

              >

                <Pressable

                  style={

                    styles.actionButton

                  }

                  onPress={() =>

                    router.push({

                      pathname:

                        "/admin/edit-recipe/[id]",

                      params: {

                        id: String(item.id),

                      },

                    })

                  }

                >

                  <Ionicons

                    name="create-outline"

                    size={20}

                    color="#53605A"

                  />

                </Pressable>

                <Pressable

                  style={

                    styles.actionButton

                  }

                  onPress={() =>

                    handleDelete(

                      item.id,

                      item.name

                    )

                  }

                  disabled={deleting}

                >

                  <Ionicons

                    name="trash-outline"

                    size={20}

                    color="#B33B31"

                  />

                </Pressable>

              </View>

            </View>

          )}

          ListEmptyComponent={

            <View

              style={styles.emptyState}

            >

              <Ionicons

                name="restaurant-outline"

                size={48}

                color="#C5C9C4"

              />

              <Text

                style={styles.emptyTitle}

              >

                No recipes found

              </Text>

              <Text

                style={styles.emptyText}

              >

                Create your first recipe

                to get started

              </Text>

            </View>

          }

        />

        <Modal

          visible={deleteModalVisible}

          transparent

          animationType="fade"

          onRequestClose={() => {

            if (!deleting) {

              setDeleteModalVisible(

                false

              );

            }

          }}

        >

          <View

            style={styles.deleteOverlay}

          >

            <View

              style={styles.deleteModal}

            >

              <View

                style={

                  styles.deleteIconContainer

                }

              >

                <Ionicons

                  name="trash-outline"

                  size={28}

                  color="#B33B31"

                />

              </View>

              <Text

                style={styles.deleteTitle}

              >

                Delete Recipe?

              </Text>

              <Text

                style={

                  styles.deleteMessage

                }

              >

                Are you sure you want to

                delete "{deleteName}"?

              </Text>

              <View

                style={styles.deleteActions}

              >

                <Pressable

                  style={

                    styles.deleteCancelButton

                  }

                  onPress={() => {

                    if (!deleting) {

                      setDeleteModalVisible(

                        false

                      );

                    }

                  }}

                  disabled={deleting}

                >

                  <Text

                    style={

                      styles.deleteCancelText

                    }

                  >

                    Cancel

                  </Text>

                </Pressable>

                <Pressable

                  style={

                    styles.deleteConfirmButton

                  }

                  onPress={

                    confirmDelete

                  }

                  disabled={deleting}

                >

                  <Text

                    style={

                      styles.deleteConfirmText

                    }

                  >

                    {deleting

                      ? "Deleting..."

                      : "Delete"}

                  </Text>

                </Pressable>

              </View>

            </View>

          </View>

        </Modal>
        <Modal
          visible={successModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSuccessModalVisible(false)}
        >
          <View style={styles.successOverlay}>
            <View style={styles.successModal}>
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={52} color="#1F7655" />
              </View>
              <Text style={styles.successTitle}>{successTitle}</Text>
              <Text style={styles.successMessage}>{successMessage}</Text>
              <Pressable
                style={styles.successButton}
                onPress={() => setSuccessModalVisible(false)}
              >
                <Text style={styles.successButtonText}>Continue</Text>
              </Pressable>
            </View>
          </View>
        </Modal>


      </SafeAreaView>

    );

  }

  const styles = StyleSheet.create({

    container: {

      flex: 1,

      backgroundColor: "#F7F8F3",

    },

    listContent: {

      paddingHorizontal: 20,

      paddingBottom: 100,

    },

    header: {

      paddingTop: 8,

      paddingBottom: 16,

    },

    headerTop: {

      flexDirection: "row",

      justifyContent:

        "space-between",

      alignItems: "center",

      marginBottom: 16,

    },

    title: {

      fontSize: 28,

      fontWeight: "800",

      color: "#17231E",

    },

    addButton: {

      flexDirection: "row",

      alignItems: "center",

      backgroundColor: "#1F7655",

      paddingHorizontal: 16,

      paddingVertical: 10,

      borderRadius: 12,

      gap: 4,

    },

    addButtonText: {

      color: "#fff",

      fontSize: 14,

      fontWeight: "700",

    },

    searchContainer: {

      marginBottom: 16,

    },

    tabContainer: {

      flexDirection: "row",

      backgroundColor: "#E7F1EA",

      borderRadius: 12,

      padding: 4,

    },

    tab: {

      flex: 1,

      paddingVertical: 8,

      alignItems: "center",

      borderRadius: 8,

    },

    tabActive: {

      backgroundColor: "#fff",

    },

    tabText: {

      fontSize: 13,

      fontWeight: "600",

      color: "#68736D",

    },

    tabTextActive: {

      color: "#17231E",

    },

    recipeCard: {

      flexDirection: "row",

      alignItems: "center",

      backgroundColor: "#fff",

      borderRadius: 20,

      borderWidth: 1,

      borderColor: "#E5E8E3",

      padding: 12,

      marginBottom: 12,

    },

    recipeContent: {

      flex: 1,

      flexDirection: "row",

      alignItems: "center",

    },

    recipeImage: {

      width: 56,

      height: 56,

      borderRadius: 14,

      backgroundColor: "#E7F1EA",

      alignItems: "center",

      justifyContent: "center",

      overflow: "hidden",

    },

    recipeImageActual: {

      width: "100%",

      height: "100%",

    },

    recipeEmoji: {

      fontSize: 24,

      fontWeight: "700",

      color: "#1F7655",

    },

    recipeInfo: {

      flex: 1,

      marginLeft: 12,

    },

    recipeName: {

      fontSize: 15,

      fontWeight: "700",

      color: "#17231E",

    },

    recipeMeta: {

      fontSize: 12,

      color: "#68736D",

      marginTop: 2,

    },

    statusBadge: {

      alignSelf: "flex-start",

      paddingHorizontal: 8,

      paddingVertical: 3,

      borderRadius: 8,

      marginTop: 4,

    },

    publishedBadge: {

      backgroundColor: "#E7F1EA",

    },

    draftBadge: {

      backgroundColor: "#FFF3E0",

    },

    statusText: {

      fontSize: 11,

      fontWeight: "600",

    },

    publishedText: {

      color: "#1F7655",

    },

    draftText: {

      color: "#E65100",

    },

    recipeActions: {

      marginLeft: 8,

      flexDirection: "row",

      alignItems: "center",

    },

    actionButton: {

      padding: 8,

    },

    emptyState: {

      alignItems: "center",

      paddingVertical: 60,

    },

    emptyTitle: {

      fontSize: 18,

      fontWeight: "700",

      color: "#17231E",

      marginTop: 16,

    },

    emptyText: {

      fontSize: 14,

      color: "#68736D",

      marginTop: 4,

    },

    deleteOverlay: {

      flex: 1,

      backgroundColor:

        "rgba(0,0,0,0.45)",

      justifyContent: "center",

      alignItems: "center",

      paddingHorizontal: 24,

    },

    deleteModal: {

      width: "100%",

      maxWidth: 400,

      backgroundColor: "#FFFFFF",

      borderRadius: 24,

      padding: 24,

    },

    deleteIconContainer: {

      width: 56,

      height: 56,

      borderRadius: 28,

      backgroundColor: "#FDECEC",

      alignItems: "center",

      justifyContent: "center",

      alignSelf: "center",

      marginBottom: 16,

    },

    deleteTitle: {

      fontSize: 20,

      fontWeight: "800",

      color: "#17231E",

      textAlign: "center",

    },

    deleteMessage: {

      fontSize: 14,

      lineHeight: 21,

      color: "#68736D",

      textAlign: "center",

      marginTop: 8,

    },

    deleteActions: {

      flexDirection: "row",

      gap: 12,

      marginTop: 24,

    },

    deleteCancelButton: {

      flex: 1,

      paddingVertical: 14,

      borderRadius: 14,

      backgroundColor: "#E7F1EA",

      alignItems: "center",

    },

    deleteCancelText: {

      fontSize: 15,

      fontWeight: "700",

      color: "#17231E",

    },

    deleteConfirmButton: {

      flex: 1,

      paddingVertical: 14,

      borderRadius: 14,

      backgroundColor: "#B33B31",

      alignItems: "center",

    },

    deleteConfirmText: {

      fontSize: 15,

      fontWeight: "700",

      color: "#FFFFFF",

    },

    successOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.45)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 24,
    },
    successModal: {
      width: "100%",
      maxWidth: 400,
      backgroundColor: "#FFFFFF",
      borderRadius: 24,
      padding: 24,
      alignItems: "center",
    },
    successIconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: "#E7F1EA",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    successTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: "#17231E",
      textAlign: "center",
    },
    successMessage: {
      fontSize: 14,
      lineHeight: 21,
      color: "#68736D",
      textAlign: "center",
      marginTop: 8,
    },
    successButton: {
      width: "100%",
      marginTop: 24,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: "#1F7655",
      alignItems: "center",
    },
    successButtonText: {
      fontSize: 15,
      fontWeight: "700",
      color: "#FFFFFF",
    },
  });
