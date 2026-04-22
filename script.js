const searchBtn = document.getElementById("searchBtn");
const input = document.getElementById("ingredientInput");
const results = document.getElementById("results");
const searchMessage = document.getElementById("searchMessage");
const recipeCount = document.getElementById("recipeCount");
const categoryFilter = document.getElementById("categoryFilter");

let allMeals = [];
let currentQuery = "";

searchBtn.addEventListener("click", function () {
    searchRecipes();
});

input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        searchRecipes();
    }
});

categoryFilter.addEventListener("change", function () {
    applyCategoryFilter();
});

function showLoader(message) {
    results.innerHTML = `
        <div class="loader">
            <div class="loader-spinner"></div>
            <p>${message}</p>
        </div>
    `;
}

function searchRecipes() {
    const query = input.value.trim();
    currentQuery = query;

    if (query === "") {
        results.innerHTML = `<p class="no-result">Please enter an ingredient or recipe name.</p>`;
        searchMessage.textContent = "";
        recipeCount.textContent = "";
        categoryFilter.innerHTML = `<option value="all">All</option>`;
        return;
    }

    searchMessage.textContent = `Showing results for: ${query}`;
    recipeCount.textContent = "";
    categoryFilter.innerHTML = `<option value="all">All</option>`;
    showLoader("Loading recipes...");

    fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${query}`)
        .then(response => response.json())
        .then(data => {
            if (data.meals) {
                fetchFullMealDetails(data.meals);
            } else {
                searchByName(query);
            }
        })
        .catch(error => {
            results.innerHTML = `<p class="no-result">Something went wrong. Please try again.</p>`;
            console.log(error);
        });
}

function searchByName(query) {
    showLoader("Searching by recipe name...");

    fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${query}`)
        .then(response => response.json())
        .then(data => {
            if (!data.meals) {
                results.innerHTML = `<p class="no-result">No recipes found for "${query}". Try chicken, egg, pasta, or cake.</p>`;
                recipeCount.textContent = "";
                categoryFilter.innerHTML = `<option value="all">All</option>`;
                return;
            }

            allMeals = data.meals;
            populateCategoryFilter(allMeals);
            displayMeals(allMeals);
        })
        .catch(error => {
            results.innerHTML = `<p class="no-result">Something went wrong while searching by name.</p>`;
            console.log(error);
        });
}

function fetchFullMealDetails(meals) {
    showLoader("Preparing recipes...");

    const detailPromises = meals.map(meal => {
        return fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`)
            .then(response => response.json())
            .then(data => data.meals[0]);
    });

    Promise.all(detailPromises)
        .then(fullMeals => {
            allMeals = fullMeals;
            populateCategoryFilter(allMeals);
            displayMeals(allMeals);
        })
        .catch(error => {
            results.innerHTML = `<p class="no-result">Could not load recipe details.</p>`;
            console.log(error);
        });
}

function populateCategoryFilter(meals) {
    const categories = [...new Set(meals.map(meal => meal.strCategory).filter(Boolean))];

    categoryFilter.innerHTML = `<option value="all">All</option>`;

    categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
}

function applyCategoryFilter() {
    const selectedCategory = categoryFilter.value;

    if (selectedCategory === "all") {
        displayMeals(allMeals);
    } else {
        const filteredMeals = allMeals.filter(meal => meal.strCategory === selectedCategory);
        displayMeals(filteredMeals);
    }
}

function displayMeals(meals) {
    results.innerHTML = "";

    if (!meals || meals.length === 0) {
        results.innerHTML = `<p class="no-result">No recipes found in this category.</p>`;
        recipeCount.textContent = "0 recipes found";
        return;
    }

    recipeCount.textContent = `${meals.length} recipe${meals.length > 1 ? "s" : ""} found`;

    meals.forEach(meal => {
        const mealDiv = document.createElement("div");
        mealDiv.classList.add("meal-card");

        mealDiv.innerHTML = `
            <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
            <h3>${meal.strMeal}</h3>
            <p class="card-info"><strong>Category:</strong> ${meal.strCategory || "Not available"}</p>
            <p class="card-info"><strong>Area:</strong> ${meal.strArea || "Not available"}</p>
        `;

        mealDiv.addEventListener("click", function () {
            showMealDetails(meal.idMeal);
        });

        results.appendChild(mealDiv);
    });
}

function showMealDetails(mealId) {
    showLoader("Loading recipe details...");

    fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`)
        .then(response => response.json())
        .then(detailData => {
            const mealDetails = detailData.meals[0];

            const ingredientsHTML = getIngredientsHTML(mealDetails);
            const stepsHTML = getStepsHTML(mealDetails.strInstructions);

            let videoHTML = "";
            if (mealDetails.strYoutube) {
                videoHTML = `
                    <h3 class="section-title">Video Tutorial</h3>
                    <a href="${mealDetails.strYoutube}" target="_blank">Watch on YouTube</a>
                `;
            }

            results.innerHTML = `
                <div class="detail-card">
                    <button id="backBtn">Back</button>
                    <h2>${mealDetails.strMeal}</h2>
                    <img src="${mealDetails.strMealThumb}" alt="${mealDetails.strMeal}">
                    <p><strong>Category:</strong> ${mealDetails.strCategory || "Not available"}</p>
                    <p><strong>Area:</strong> ${mealDetails.strArea || "Not available"}</p>

                    <h3 class="section-title">Ingredients</h3>
                    <ul>${ingredientsHTML}</ul>

                    <h3 class="section-title">Step-by-step Instructions</h3>
                    <ol>${stepsHTML}</ol>

                    ${videoHTML}
                </div>
            `;

            document.getElementById("backBtn").addEventListener("click", function () {
                applyCategoryFilter();
            });
        })
        .catch(error => {
            results.innerHTML = `<p class="no-result">Could not load recipe details.</p>`;
            console.log(error);
        });
}

function getIngredientsHTML(mealDetails) {
    let ingredientsHTML = "";

    for (let i = 1; i <= 20; i++) {
        const ingredient = mealDetails[`strIngredient${i}`];
        const measure = mealDetails[`strMeasure${i}`];

        if (ingredient && ingredient.trim() !== "") {
            const cleanIngredient = ingredient.trim();
            const cleanMeasure = measure ? measure.trim() : "";

            if (cleanMeasure !== "") {
                ingredientsHTML += `<li>${cleanIngredient} - ${cleanMeasure}</li>`;
            } else {
                ingredientsHTML += `<li>${cleanIngredient}</li>`;
            }
        }
    }

    return ingredientsHTML || "<li>Ingredients not available.</li>";
}

function getStepsHTML(instructionsText) {
    if (!instructionsText || instructionsText.trim() === "") {
        return "<li>Instructions not available.</li>";
    }

    let cleanedText = instructionsText
        .replace(/\r\n/g, "\n")
        .replace(/\n+/g, "\n")
        .trim();

    let rawSteps = cleanedText.split(/\n|\. /);
    let stepsHTML = "";

    rawSteps.forEach(step => {
        const cleanStep = step.trim();
        if (cleanStep !== "") {
            stepsHTML += `<li>${cleanStep.endsWith(".") ? cleanStep : cleanStep + "."}</li>`;
        }
    });

    return stepsHTML || "<li>Instructions not available.</li>";
}