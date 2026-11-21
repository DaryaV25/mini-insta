"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Comment extends Model {
    static associate(models) {
      Comment.belongsTo(models.Photo, { foreignKey: "photoId", as: "photo" });
      Comment.belongsTo(models.User, { foreignKey: "userId", as: "user" });
      models.Photo.hasMany(Comment, { foreignKey: "photoId", as: "comments" });
    }
  }

  Comment.init(
    {
      photoId: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      text: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          len: {
            args: [1, 500],
            msg: "Комментарий должен быть от 1 до 500 символов",
          },
        },
      },
    },
    {
      sequelize,
      modelName: "Comment",
      tableName: "Comments",
    },
  );

  return Comment;
};
