"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      "Photos",
      [
        {
          title: "Закат на море",
          imageUrl:
            "https://img.magnific.com/free-photo/beautiful-shot-colorful-sunset-beach_181624-27368.jpg?semt=ais_hybrid&w=740&q=80",
          filter: "vintage",
          album: "Путешествия",
          likes: 42,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: "Кофе в городе",
          imageUrl:
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSZdduN4rshXLcQfFOhrvy5KU45xgz3Br-Ss92wyHWpTK1p0Pq51cMd2k1Z&s=10",
          filter: "sepia",
          album: "Повседневность",
          likes: 18,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: "Горы зимой",
          imageUrl:
            "https://img.magnific.com/free-photo/beautiful-shot-mountains-trees-covered-snow-fog_181624-17590.jpg?semt=ais_hybrid&w=740&q=80",
          filter: "none",
          album: "Путешествия",
          likes: 67,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {},
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Photos", null, {});
  },
};
